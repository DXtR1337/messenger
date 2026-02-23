import AuthForm from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Utwórz konto',
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
