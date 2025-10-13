import { useEffect } from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redireciona automaticamente para a página inicial após 1 segundo
    const timer = setTimeout(() => {
      navigate("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Página não encontrada
        </h1>
        <p className="text-gray-600">
          Redirecionando para a página inicial...
        </p>
      </div>
    </div>
  );
}
