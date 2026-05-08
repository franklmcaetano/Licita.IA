"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Scale, Send, LogOut, Plus, ShieldAlert, CheckCircle,
  Clock, Gavel, FileText, Loader2, Sparkles, X, Info, Mail, Menu, Target, History
} from "lucide-react";
import '../globals.css';

// ==========================================
// CHAMADA SEGURA À API INTERNA (Sem expor chaves)
// ==========================================
const callBackendAPI = async (textContext, isJson = false, userQuestion = null) => {
  const response = await fetch('/api/analise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textContext, isJson, userQuestion })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Falha na comunicação com o servidor.");
  }

  if (isJson) {
    try {
      const cleanJson = data.result.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      throw new Error("Falha ao montar a inteligência tática do documento.");
    }
  }
  return data.result;
};

const renderMarkdown = (text) => {
  if (!text || typeof text !== 'string') return "";
  return text.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>').replace(/^---$/gm, '<hr/>').replace(/^[-•] (.+)$/gm, '<li>$1</li>').replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`).replace(/\n{2,}/g, '</p><p>').replace(/^(?!<[h|u|b|l|h])(.+)$/gm, (m) => m ? `<p>${m}</p>` : '').replace(/<p><\/p>/g, '');
};

const ScoreRing = ({ score }) => {
  const safeScore = Number(score) || 50;
  const r = 32, c = 2 * Math.PI * r;
  const color = safeScore >= 75 ? '#c1121f' : safeScore >= 50 ? '#c9a84c' : '#1b6b3a';
  const offset = ((100 - safeScore) / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e8e2d8" strokeWidth={6} />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold leading-none" style={{ color }}>{safeScore}</span>
        </div>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>Risco</span>
    </div>
  );
};

const AuditReport = ({ report }) => {
  if (!report) return null; 
  const [tab, setTab] = useState("vulnerabilidades");
  const tabs = [
    { id:'vulnerabilidades', label:'Vulnerabilidades', icon:ShieldAlert, count: report.vulnerabilidades?.length || 0 },
    { id:'ataque', label:'Vantagem Decisiva', icon:Target, count: report.oportunidadesOfensivas?.length || 0 },
    { id:'checklist', label:'Checklist', icon:CheckCircle },
    { id:'prazos', label:'Prazos', icon:Clock, count: report.prazos?.length || 0 },
    { id:'minuta', label:'Minuta', icon:FileText },
  ];
  return (
    <div className="bg-white border border-[#e5e0d6] rounded-xl overflow-hidden mb-4 w-full shadow-sm animate-fade-in flex flex-col">
      <div className="bg-[#111318] p-5 md:p-6 flex justify-between items-start gap-4">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1 bg-[#c9a84c]/15 text-[#c9a84c] text-[11px] font-bold px-2 py-1 rounded-md uppercase tracking-wider mb-3"><Sparkles size={12} /> Diagnóstico Final</span>
          <h3 className="text-white text-lg md:text-xl font-bold leading-tight mb-2 tracking-tight">{report.orgao || "Órgão Não Identificado"}</h3>
          <p className="text-gray-400 text-[13px] md:text-sm">{report.objeto || "Objeto em análise"}</p>
        </div>
        <ScoreRing score={report.score} />
      </div>
      <div className="p-4 md:p-5 bg-[#fcf9f2] border-b border-[#e5e0d6]">
        <p className="text-[14.5px] md:text-[15px] text-[#111318] leading-relaxed font-medium"><strong className="text-[#c9a84c]">↳ Resumo Tático: </strong>{report.resumoExecutivo || "Aguardando diagnóstico..."}</p>
      </div>
      <div className="flex border-b border-[#e5e0d6] overflow-x-auto hide-scroll bg-white">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 md:px-5 py-4 text-[13px] font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-[#111318] text-[#111318]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
            <t.icon size={16} /> {t.label}
            {t.count > 0 && <span className={`px-2 py-0.5 rounded-full text-[11px] ${tab === t.id ? 'bg-[#111318] text-white' : 'bg-gray-100'}`}>{t.count}</span>}
          </button>
        ))}
      </div>
      
      <div className="p-5 md:p-6 min-h-[200px] max-h-[60vh] overflow-y-auto bg-white">
        {tab === "vulnerabilidades" && (
          <div className="flex flex-col gap-4">
            {(report.vulnerabilidades || []).map((v, i) => (
              <div key={i} className="relative border border-[#f5c0c3] bg-[#fff9f9] rounded-xl p-4 md:p-5 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-1 rounded border border-red-100 uppercase tracking-wide">{v.gravidade}</span>
                </div>
                <h4 className="text-base md:text-[17px] font-bold text-[#111318] mb-2">{v.titulo}</h4>
                <p className="text-[14.5px] text-gray-700 leading-relaxed mb-4">{v.descricao}</p>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[13px] font-semibold px-2 py-1 rounded border border-blue-100"><Gavel size={14} /> {v.baseLegal}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "ataque" && (
          <div className="flex flex-col gap-4">
            {(report.oportunidadesOfensivas || []).map((op, i) => (
              <div key={i} className="relative border border-[#c9a84c] bg-[#fdf6e3] rounded-xl p-4 md:p-5 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#c9a84c]" />
                <h4 className="text-base md:text-[17px] font-bold text-[#111318] mb-2 flex items-center gap-2">
                  <Target size={18} className="text-[#a68832]" /> {op.titulo}
                </h4>
                <p className="text-[14.5px] text-[#5c4716] leading-relaxed mb-4 font-medium">{op.descricao}</p>
                <span className="inline-flex items-center gap-1.5 bg-white text-[#8a6d2f] text-[13px] font-bold px-2 py-1 rounded border border-[#e5e0d6] shadow-sm"><Gavel size={14} /> {op.fundamento}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "checklist" && (
           <div className="flex flex-col gap-6">
             {(report.checklist || []).map((cat, i) => (
               <div key={i}>
                 <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">{cat.categoria}</p>
                 <div className="flex flex-col gap-2">
                   {(cat.itens || []).map((item, j) => (
                     <div key={j} className="flex gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 items-start">
                       <CheckCircle size={18} className={item.alerta ? "text-[#c9a84c] mt-0.5 shrink-0" : "text-gray-300 mt-0.5 shrink-0"} />
                       <span className="text-[14.5px] text-[#111318] font-medium">{item.item || item}</span>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
           </div>
        )}
        {tab === "prazos" && (
           <div className="flex flex-col gap-3">
             {(report.prazos || []).map((p, i) => (
               <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 rounded-xl bg-white shadow-sm gap-3">
                 <div className="flex items-center gap-4">
                   <Clock size={20} className="text-[#111318] shrink-0" />
                   <div>
                     <p className="font-bold text-[15px] text-[#111318]">{p.tipo}</p>
                     <p className="font-mono text-[13px] text-gray-500 mt-1">{p.data}</p>
                   </div>
                 </div>
                 <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-1 rounded uppercase tracking-wide self-start md:self-auto">{p.urgencia}</span>
               </div>
             ))}
           </div>
        )}
        {tab === "minuta" && (
           <div className="bg-[#fdfaf6] border border-[#e5e0d6] rounded-xl p-5 md:p-6 text-[14.5px] md:text-[15px] leading-loose text-[#111318] font-serif whitespace-pre-wrap">
             {report.minutaImpugnacao || "Nenhuma minuta gerada para este contexto."}
           </div>
        )}
      </div>
      <div className="bg-gray-50 border-t border-[#e5e0d6] p-4 flex gap-3 items-start">
        <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
        <p className="text-[12px] leading-relaxed text-gray-500 font-medium">
          <strong>Aviso Legal:</strong> Ferramenta de inteligência probabilística focada em vantagem estratégica. Valide dados extraídos com um profissional habilitado antes da decisão final.
        </p>
      </div>
    </div>
  );
};

export default function MainApp() {
  const { data: session, status } = useSession();
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [appState, setAppState] = useState({ fileName:'', context:'', messages:[] });
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setPdfjsReady(true);
      };
      document.head.appendChild(s);
    }
  }, []);

  // Aciona a busca do histórico assim que a sessão do NextAuth estiver pronta
  useEffect(() => {
    if (session?.user?.id) {
      fetchHistory();
    }
  }, [session]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [appState.messages, isProcessing]);

  // ==========================================
  // FUNÇÕES DE BANCO DE DADOS (Chamadas via Backend)
  // ==========================================
  const saveAuditToDatabase = async (fileName, textContext, report) => {
    if (!session?.user?.id) return;
    try {
      await fetch('/api/historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, reportData: report, fullText: textContext })
      });
      fetchHistory(); // Recarrega o painel lateral
    } catch (e) {
      console.error("Erro ao guardar histórico: ", e);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/historico');
      const data = await response.json();
      if (data.history) {
        setHistoryList(data.history);
      }
    } catch (e) {
      console.error("Erro ao buscar histórico: ", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadPastAudit = (audit) => {
    setMenuOpen(false);
    setAppState({
      fileName: audit.fileName,
      context: audit.fullText || "Texto original ausente.",
      messages: [
        { role:'user', type:'text', text:`📄 Histórico Carregado: **${audit.fileName}**` },
        { role:'assistant', type:'audit', report: audit.reportData }
      ]
    });
  };

  const readPDF = async (file) => {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it => it.str).join(' ') + '\n';
    }
    return text;
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || isProcessing) return;
    setMenuOpen(false);
    setIsProcessing(true);
    setAppState({ fileName: file.name, context: '', messages: [{ role:'user', type:'text', text:`📄 Avaliando Estratégia: **${file.name}**` }] });

    try {
      const text = await readPDF(file);
      setAppState(prev => ({ ...prev, context: text }));
      
      const report = await callBackendAPI(text, true, null);
      
      setAppState(prev => ({ ...prev, messages: [...prev.messages, { role:'assistant', type:'audit', report }] }));
      await saveAuditToDatabase(file.name, text, report);

    } catch (err) {
      setAppState(prev => ({ ...prev, messages: [...prev.messages, { role:'assistant', type:'text', text:`❌ Erro de Sistema: ${err.message}` }] }));
    }
    setIsProcessing(false);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;
    const userText = input;
    setInput('');
    setIsProcessing(true);
    setAppState(prev => ({ ...prev, messages: [...prev.messages, { role:'user', type:'text', text: userText }] }));

    try {
      const response = await callBackendAPI(appState.context, false, userText);
      setAppState(prev => ({ ...prev, messages: [...prev.messages, { role:'assistant', type:'text', text: response }] }));
    } catch (err) {
      setAppState(prev => ({ ...prev, messages: [...prev.messages, { role:'assistant', type:'text', text:`❌ Erro: ${err.message}` }] }));
    }
    setIsProcessing(false);
  }, [input, isProcessing, appState.context]);

  // Evita renderizar a interface antes de o NextAuth confirmar se o usuário existe
  if (status === "loading") {
    return <div className="h-screen w-full flex items-center justify-center bg-[#111318]"><Loader2 className="animate-spin text-[#c9a84c]" size={48} /></div>;
  }

  const isEmpty = appState.messages.length === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fdfaf6] font-sans">
      {menuOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed md:relative top-0 left-0 h-full w-[280px] bg-[#111318] flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 shadow-2xl ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center"><Scale size={18} className="text-[#111318]" /></div>
            <span className="text-white text-[19px] font-bold tracking-tight">Soluções.IA</span>
          </div>
          <button className="md:hidden text-gray-400 hover:text-white p-2" onClick={() => setMenuOpen(false)}><X size={24}/></button>
        </div>
        <div className="p-5">
          <button onClick={() => fileInputRef.current?.click()} disabled={!pdfjsReady || isProcessing} className="w-full bg-[#c9a84c] text-[#111318] font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 text-[15px]">
            {!pdfjsReady ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} Nova Análise
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 border-t border-white/5">
          <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <History size={14} /> Arquivo Tático ({historyList.length})
          </p>
          {loadingHistory ? (
             <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-500" size={20} /></div>
          ) : historyList.length === 0 ? (
             <p className="text-gray-600 text-[13px] px-2 italic">Nenhum documento registado.</p>
          ) : (
            <div className="space-y-2">
              {historyList.map(audit => (
                <button key={audit.id} onClick={() => loadPastAudit(audit)} className="w-full text-left p-3 hover:bg-white/5 rounded-lg transition-colors group flex flex-col gap-1">
                  <span className="text-gray-300 text-[13px] font-medium truncate w-full group-hover:text-white transition-colors">{audit.fileName}</span>
                  <span className="text-gray-600 text-[10px] font-mono">{new Date(audit.createdAt).toLocaleDateString('pt-BR')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 bg-black/40">
           <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 bg-[#2a2d35] rounded-full flex items-center justify-center"><Mail size={14} className="text-gray-400" /></div>
              <div className="overflow-hidden">
                 <p className="text-white text-[13px] font-medium truncate">{session?.user?.email || "Operador"}</p>
                 <p className="text-emerald-500 text-[11px] font-bold">Acesso Seguro</p>
              </div>
           </div>
           {/* Botão de Logout seguro do NextAuth */}
           <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 text-red-400 hover:text-red-300 font-bold text-[14px] px-2 py-2 w-full transition-colors rounded-lg hover:bg-red-950/30">
              <LogOut size={16} /> Encerrar Conexão
           </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-[#fdfaf6]">
        <div className="h-16 md:h-[72px] bg-white border-b border-[#e5e0d6] flex items-center px-4 md:px-8 shrink-0 gap-4">
           <button className="md:hidden text-[#111318] p-1" onClick={() => setMenuOpen(true)}><Menu size={26}/></button>
           <div>
             <h2 className="text-[#111318] font-bold text-[15px] md:text-[17px]">{appState.fileName ? `📄 ${appState.fileName}` : 'Centro de Comando Operacional'}</h2>
             <p className="text-gray-500 text-[13px] md:text-[14px] font-semibold">{appState.context ? 'Documento carregado no sistema' : 'Aguardando instrução'}</p>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto px-4 animate-fade-in">
                 <div className="w-24 h-24 bg-[#c9a84c] rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-[#c9a84c]/20"><Scale size={48} className="text-[#111318]" /></div>
                 <h1 className="text-[32px] md:text-[40px] font-extrabold text-[#111318] mb-4 tracking-tight leading-tight">Painel de Vantagem Decisiva</h1>
                 <p className="text-gray-600 text-[15px] md:text-[17px] font-medium leading-relaxed mb-8">Insira o instrumento convocatório para extração de dados sensíveis e auditoria de parâmetros.</p>
                 <button className="md:hidden bg-[#111318] text-white text-[16px] font-bold py-4 px-8 rounded-xl w-full shadow-lg" onClick={()=>setMenuOpen(true)}>Iniciar Varredura</button>
              </div>
           ) : (
              <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full pb-4">
                 {appState.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                       {msg.role === 'user' ? (
                          <div className="bg-[#111318] text-white font-medium px-5 py-4 rounded-2xl rounded-tr-sm max-w-[90%] md:max-w-[80%] text-[15px] md:text-[16px] shadow-md whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                       ) : msg.type === 'audit' ? (
                          <AuditReport report={msg.report} />
                       ) : (
                          <div className="flex gap-4 md:gap-5 w-full">
                             <div className="hidden md:flex w-10 h-10 bg-[#c9a84c] rounded-xl items-center justify-center shrink-0 mt-1 shadow-sm"><Scale size={20} className="text-[#111318]" /></div>
                             <div className="bg-white border border-[#e5e0d6] px-5 py-5 md:px-6 md:py-6 rounded-2xl rounded-tl-sm w-full md:max-w-[90%] shadow-sm prose text-[15px] md:text-[16px] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                          </div>
                       )}
                    </div>
                 ))}
                 {isProcessing && (
                    <div className="flex items-center gap-3 bg-white border border-[#e5e0d6] p-4 rounded-xl w-fit shadow-sm ml-0 md:ml-14">
                       <Loader2 size={20} className="animate-spin text-[#c9a84c]" />
                       <span className="text-[15px] font-bold text-[#8a6d2f]">Processando vetores de dados...</span>
                    </div>
                 )}
                 <div ref={chatEndRef} />
              </div>
           )}
        </div>
        <div className="p-4 md:p-6 bg-white border-t border-[#e5e0d6] shrink-0 z-10">
           <div className="max-w-4xl mx-auto flex gap-3 relative shadow-sm rounded-xl">
              <input 
                 value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter') handleSend(); }}
                 disabled={isProcessing || !appState.context}
                 placeholder={appState.context ? "Questione o sistema operacional sobre o documento..." : "Aguardando envio do edital..."}
                 className="flex-1 bg-[#fdfaf6] border border-[#e5e0d6] rounded-xl px-5 md:px-6 py-4 md:py-5 text-[15px] md:text-[16px] font-medium focus:border-[#c9a84c] focus:ring-4 focus:ring-[#c9a84c]/10 outline-none transition-all disabled:opacity-50"
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isProcessing} className="bg-[#111318] text-white w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center hover:bg-[#2a2d35] disabled:bg-gray-200 disabled:text-gray-400 transition-colors shrink-0">
                 <Send size={24} />
              </button>
           </div>
        </div>
      </main>
    </div>
  );
}
