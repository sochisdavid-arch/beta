
'use server';

export type PigDoctorInput = {
  symptoms: string;
  photoDataUri?: string;
};

export type PigDoctorDiagnosisCandidate = {
  diseaseName: string;
  probability: number;
};

export type PigDoctorOutput = {
  riskLevel: 'Brote Potencial' | 'Bajo' | 'Moderado';
  presumptiveDiagnosis: PigDoctorDiagnosisCandidate & { justification: string };
  differentialDiagnoses: PigDoctorDiagnosisCandidate[];
  recommendedTreatment: {
    medication: string;
    complementaryMeasures: string;
    withdrawalPeriod: string;
  };
  operationalRecommendations: string[];
};

function clampPct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

export async function getPigDiagnosis(input: PigDoctorInput): Promise<PigDoctorOutput | null> {
  const text = (input.symptoms ?? '').toLowerCase();
  if (!text.trim()) return null;

  const mentionsManyCases = includesAny(text, ['varios', 'muchos', 'brote', '4 casos', '5 casos', '6 casos', '7 casos']);
  const hasDiarrhea = includesAny(text, ['diarrea', 'heces', 'acuosa', 'amarillenta']);
  const hasDehydration = includesAny(text, ['deshidrat', 'ojos hundidos', 'letargo', 'no quiere comer', 'anorexia']);
  const ageWeaner = includesAny(text, ['destete', 'días', '35 dias', '35 días', '30', '40']);

  const baseRisk: PigDoctorOutput['riskLevel'] =
    mentionsManyCases ? 'Brote Potencial' : hasDiarrhea && hasDehydration ? 'Moderado' : 'Bajo';

  // Nota: esto es un fallback “sin IA” para mantener la app compilable.
  let presumptive: PigDoctorOutput['presumptiveDiagnosis'];
  let differentials: PigDoctorOutput['differentialDiagnoses'];
  let treatment: PigDoctorOutput['recommendedTreatment'];
  let ops: PigDoctorOutput['operationalRecommendations'];

  if (hasDiarrhea && ageWeaner) {
    presumptive = {
      diseaseName: 'Colibacilosis (E. coli) post-destete',
      probability: clampPct(72 + (hasDehydration ? 8 : 0)),
      justification:
        'Diarrea acuosa en lechones en etapa post-destete con signos de deshidratación sugiere enteritis bacteriana; se recomienda confirmación con diagnóstico veterinario.',
    };
    differentials = [
      { diseaseName: 'Coccidiosis', probability: clampPct(55 - (hasDehydration ? 5 : 0)) },
      { diseaseName: 'Salmonelosis', probability: clampPct(40 + (mentionsManyCases ? 5 : 0)) },
      { diseaseName: 'Rotavirus', probability: 35 },
    ];
    treatment = {
      medication:
        'Rehidratación oral/pareneteral según severidad y plan terapéutico indicado por el veterinario; considerar antimicrobiano solo tras evaluación clínica y, de ser posible, antibiograma.',
      complementaryMeasures:
        'Aislar afectados, mejorar cama/sequedad, reforzar higiene de bebederos/comederos, revisar calidad de agua, temperatura ambiental y estrés de destete.',
      withdrawalPeriod: 'Según el fármaco indicado por el veterinario y su ficha técnica.',
    };
    ops = [
      'Registrar número de casos por corral y evolución diaria.',
      'Separar enfermos y desinfectar áreas de alto contacto.',
      'Verificar temperatura, ventilación y disponibilidad de agua limpia.',
      'Consultar al veterinario para confirmación y plan sanitario del lote.',
    ];
  } else {
    presumptive = {
      diseaseName: 'Cuadro gastrointestinal inespecífico',
      probability: 50,
      justification:
        'La descripción no es suficiente para una hipótesis específica sin evaluación clínica. Se sugiere ampliar signos (fiebre, vómito, tos), edad exacta y evolución, y considerar pruebas.',
    };
    differentials = [
      { diseaseName: 'Estrés/alteración dietaria', probability: 45 },
      { diseaseName: 'Parasitosis intestinal', probability: 35 },
      { diseaseName: 'Infección bacteriana entérica', probability: 30 },
    ];
    treatment = {
      medication:
        'Soporte hídrico y electrolitos según indicación profesional; evitar medicación empírica sin evaluación veterinaria.',
      complementaryMeasures:
        'Revisar dieta/cambio de alimento, manejo, agua, limpieza y densidad. Monitorizar consumo y estado corporal.',
      withdrawalPeriod: 'No aplica si no se administra medicación; si se medica, seguir ficha técnica.',
    };
    ops = [
      'Recolectar datos: temperatura, apetito, consistencia de heces y mortalidad.',
      'Revisar cambios recientes (alimento, manejo, vacunación, traslado).',
      'Contactar a un veterinario para diagnóstico y medidas.',
    ];
  }

  // Pequeño ajuste para que sumen de forma razonable (sin ser “real”).
  const remaining = clampPct(100 - presumptive.probability);
  const totalDiff = differentials.reduce((a, d) => a + d.probability, 0) || 1;
  differentials = differentials.map((d) => ({
    ...d,
    probability: clampPct((d.probability / totalDiff) * remaining),
  }));

  return {
    riskLevel: baseRisk,
    presumptiveDiagnosis: presumptive,
    differentialDiagnoses: differentials,
    recommendedTreatment: treatment,
    operationalRecommendations: ops,
  };
}
