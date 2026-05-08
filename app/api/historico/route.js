import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../auth/[...nextauth]/route";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";

// Inicializa o Firebase no Servidor
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
const appFirebase = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(appFirebase);

// ROTA PARA BUSCAR O HISTÓRICO (GET)
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    // Isolamento Multi-Tenant: Força a busca apenas pelo ID do utilizador logado
    const q = query(collection(db, "audits"), where("userId", "==", session.user.id));
    const querySnapshot = await getDocs(q);
    
    const docs = [];
    querySnapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
    
    // Ordena do mais recente para o mais antigo
    docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ history: docs });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 });
  }
}

// ROTA PARA SALVAR UM NOVO EDITAL (POST)
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { fileName, reportData, fullText } = body;

    await addDoc(collection(db, "audits"), {
      userId: session.user.id, // Amarra o documento INVIOLAVELMENTE ao usuário logado
      fileName,
      reportData,
      fullText,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao salvar no banco" }, { status: 500 });
  }
}
