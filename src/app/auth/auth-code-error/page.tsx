import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0A2342] via-[#0A2342] to-[#1a3a5c] px-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-black text-[#0A2342] mb-2">Error de autenticación</h1>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Hubo un problema al iniciar sesión. Esto puede ocurrir si el enlace expiró
          o si hubo un problema con la verificación. Por favor intentá de nuevo.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#0A2342] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1a3a5c] transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
