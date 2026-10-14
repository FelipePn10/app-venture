import axios from "axios";

/** 404: o registro ainda não existe (estado legítimo, não falha). */
export function ehNaoEncontrado(e: unknown): boolean {
  return axios.isAxiosError(e) && e.response?.status === 404;
}
