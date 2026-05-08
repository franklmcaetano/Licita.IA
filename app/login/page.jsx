"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Scale, Lock, Mail, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { redirect: false, email, password });
    if (res.error) { setErrorMsg("Credenciais inválidas"); setLoading(false); } 
    else { router.push("/painel"); }
  };

  return (
    <div className="flex h-screen w-full bg-[#fdfaf6]">
      <div className="hidden md:flex w-1/2 bg-[#111318] p-16 flex-col justify-center">
        <Scale size={48} className="text-[#c9a84c] mb-6" />
        <h1 className="text-white text-5xl font-extrabold mb-4">Vantagem Decisiva.</h1>
        <p className="text-gray-400 text-lg">Inteligência Tática para Editais.</p>
      </div>
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-8 rounded-2xl border border-[#e5e0d6] shadow-xl">
          <h2 className="text-2xl font-bold text-[#111318] mb-6 text-center">Acesso Restrito</h2>
          {errorMsg && <p className="text-red-600 text-sm mb-4 text-center">{errorMsg}</p>}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3 text-gray-400" size={20}/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full pl-12 p-3 bg-gray-50 rounded-lg outline-none border border-transparent focus:border-[#c9a84c]" placeholder="admin@licitacoes.ia" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3 text-gray-400" size={20}/>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full pl-12 p-3 bg-gray-50 rounded-lg outline-none border border-transparent focus:border-[#c9a84c]" placeholder="estrategia123" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#111318] text-white p-3 rounded-lg font-bold flex justify-center hover:bg-[#2a2d35] transition-colors">
              {loading ? <Loader2 className="animate-spin text-[#c9a84c]"/> : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
