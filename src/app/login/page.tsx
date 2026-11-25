import { SignInForm } from "../../components/auth/sign-in-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <SignInForm />
    </main>
  );
}
