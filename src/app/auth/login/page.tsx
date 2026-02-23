import AuthForm from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Zaloguj się',
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
