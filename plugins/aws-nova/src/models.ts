
export const NOVA_MODELS = {
  'nova-pro': {
    name: 'AWS Nova Pro',
    maxTokens: 4096,
    supportsFunctions: true,
  },
  'nova-lite': {
    name: 'AWS Nova Lite',
    maxTokens: 2048,
    supportsFunctions: true,
  },
  'nova-micro': {
    name: 'AWS Nova Micro',
    maxTokens: 1024,
    supportsFunctions: false,
  },
  'nova-sonic': {
    name: 'AWS Nova Sonic',
    maxTokens: 4096,
    supportsFunctions: true,
  },
} as const;

export type NovaModel = keyof typeof NOVA_MODELS;

export const isNovaModel = (model: string): model is NovaModel => {
  return model in NOVA_MODELS;
};

export const getNovaModel = (model: string) => {
  if (!isNovaModel(model)) {
    throw new Error(`Invalid Nova model: ${model}`);
  }
  return NOVA_MODELS[model];
};
