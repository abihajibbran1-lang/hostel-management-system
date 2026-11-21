import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="max-w-xl text-center">
        <h1 className="text-3xl font-semibold">Hostel Management System</h1>
        <p className="mt-3 text-slate-600">Project foundation is ready for domain modules.</p>
        <Link
          className="mt-5 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          href="/schedule"
        >
          My Schedule
        </Link>
      </section>
    </main>
  );
}
