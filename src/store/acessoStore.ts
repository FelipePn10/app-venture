import { create } from 'zustand';
import { type MinhasPermissoes, minhasPermissoes } from '@/services/acessoService';

/**
 * Permissões do usuário na empresa da sessão. Não fica guardada no disco: é
 * lida de novo a cada abertura do painel, porque o administrador pode mudar o
 * perfil a qualquer momento. Falha de leitura não esconde nada — o backend
 * continua recusando o que o perfil não permite.
 */
interface AcessoState {
  acesso: MinhasPermissoes | null;
  carregar: () => Promise<void>;
  limpar: () => void;
}

export const useAcessoStore = create<AcessoState>((set) => ({
  acesso: null,
  carregar: async () => {
    try { set({ acesso: await minhasPermissoes() }); } catch { set({ acesso: null }); }
  },
  limpar: () => set({ acesso: null }),
}));
