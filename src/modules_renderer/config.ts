import { RendererConfig } from "../modules_common/types"

let config: RendererConfig;

export const setConfig = (_config: RendererConfig) => {
  config = _config;
}

export const getConfig = () => {
  return config;
}
