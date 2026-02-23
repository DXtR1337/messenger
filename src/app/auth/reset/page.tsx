import AuthForm from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Resetuj hasło',
};

export default function ResetPage() {
  return <AuthForm mode="reset" />;
}
