import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { InputField } from '@/components/ui/InputField';
import { login } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

export function LoginPage(): JSX.Element {
  const setAuthData = useAuthStore((state) => state.setAuthData);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const response = await login({ email, password });
      setAuthData(response.token, response.userName);
    } catch (error) {
      const defaultMessage = 'Falha ao autenticar. Verifique suas credenciais.';
      setErrorMessage(error instanceof Error ? error.message : defaultMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-card" aria-label="Tela de autenticação do ERP">
        <h1>ERP Venture</h1>
        <p>Interface corporativa moderna para operações empresariais.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <InputField
            id="email"
            label="E-mail"
            type="email"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <InputField
            id="password"
            label="Senha"
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {errorMessage ? <span className="error-message">{errorMessage}</span> : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </section>
    </main>
  );
}
