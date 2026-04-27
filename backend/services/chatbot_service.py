import os
import logging
from typing import Optional
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

try:
    from langchain_groq import ChatGroq
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS

    # LangChain import paths differ across versions; support both layouts.
    try:
        from langchain.prompts import PromptTemplate
    except Exception:
        from langchain_core.prompts import PromptTemplate

    try:
        from langchain.chains import RetrievalQA
    except Exception:
        from langchain_classic.chains import RetrievalQA

    LANGCHAIN_IMPORT_ERROR = None
except Exception as import_error:
    ChatGroq = None
    HuggingFaceEmbeddings = None
    PromptTemplate = None
    RetrievalQA = None
    FAISS = None
    LANGCHAIN_IMPORT_ERROR = str(import_error)

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────
DATA_DIR = os.path.join(BASE_DIR, "data")
FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")
CSV_DATA_PATH = os.path.join(DATA_DIR, "datasets", "chatbot_full_dataset.csv")

# ── Global Instances ────────────────────────────
_qa_chain = None
_embedder = None


def _fallback_answer(question: str) -> str:
    q = (question or "").lower()

    if "phishing" in q and ("scan" in q or "url" in q):
        return (
            "To scan a phishing URL: go to the Phishing page, choose URL Scanner, paste the URL, and click Analyze. "
            "You will get a verdict (SAFE/PHISHING/SUSPICIOUS), risk score, confidence, and security recommendations."
        )

    if "steg" in q or "hidden" in q or "lsb" in q or "image" in q:
        return (
            "The steganography detector analyzes uploaded images using LSB anomaly checks, chi-square style statistical analysis, "
            "entropy signals, and metadata anomalies. It returns verdict, confidence, anomaly score, and payload estimate."
        )

    if "dashboard" in q or "stats" in q or "history" in q:
        return (
            "The dashboard shows total scans, threats found, clean scans, average risk score, weekly trend, and scan history. "
            "Data is fetched from /api/v1/stats/summary, /api/v1/stats/weekly, and /api/v1/scans."
        )

    if "what can" in q or "ai-shield" in q or "platform" in q:
        return (
            "AI-SHIELD provides phishing URL/email analysis, image steganography detection, a scan history dashboard, and an assistant chatbot. "
            "It returns risk scores, confidence, forensic indicators, and recommendations for each scan."
        )

    return (
        "I can help with phishing scans, email checks, steganography analysis, dashboard stats, and platform usage. "
        "Try asking: 'How do I scan a phishing URL?'"
    )

def get_embedder():
    global _embedder
    if LANGCHAIN_IMPORT_ERROR:
        logger.error(f"LangChain components unavailable: {LANGCHAIN_IMPORT_ERROR}")
        return None
    if _embedder is None:
        try:
            _embedder = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            logger.info("Chatbot embedder initialized.")
        except Exception as e:
            logger.error(f"Error initializing chatbot embedder: {e}")
    return _embedder

def get_qa_chain():
    global _qa_chain
    if _qa_chain is not None:
        return _qa_chain

    if LANGCHAIN_IMPORT_ERROR:
        logger.error(f"Chatbot dependencies are unavailable: {LANGCHAIN_IMPORT_ERROR}")
        return None

    groq_api_key = (
        os.getenv("GROQ_API_KEY")
        or os.getenv("groq_api_key")
        or os.getenv("GROQ_APIKEY")
    )
    if not groq_api_key:
        logger.warning("GROQ_API_KEY not found in environment. Chatbot will not be functional.")
        return None

    try:
        llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.1-8b-instant")
        embedder = get_embedder()
        
        if not os.path.exists(FAISS_INDEX_PATH):
            logger.warning(f"FAISS index not found at {FAISS_INDEX_PATH}. Please run training script.")
            return None

        vectordb = FAISS.load_local(
            FAISS_INDEX_PATH, 
            embedder, 
            allow_dangerous_deserialization=True
        )

        retriever = vectordb.as_retriever(score_threshold=0.7)

        prompt_template = """Given the following context and a question, generate an answer based on this context only. In the answer try to provide as much text as possible from "response" section in the source document context without making much changes. If the answer is not found in the context, kindly state "I don't know." Don't try to make up an answer. No Preamble.
        
        CONTEXT: {context}
        
        QUESTION: {question}"""

        PROMPT = PromptTemplate(
            template=prompt_template, input_variables=["context", "question"]
        )

        _qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            input_key="query",
            return_source_documents=True,
            chain_type_kwargs={"prompt": PROMPT}
        )
        logger.info("Chatbot QA chain initialized.")
        return _qa_chain
    except Exception as e:
        logger.error(f"Error initializing chatbot QA chain: {e}")
        return None

def ask_chatbot(question: str) -> str:
    chain = get_qa_chain()
    if not chain:
        return _fallback_answer(question)
    
    try:
        response = chain.invoke({"query": question})
        answer = response.get('result', "").strip()
        if not answer or answer.lower() in {"i don't know.", "i dont know.", "i don't know", "i dont know"}:
            return _fallback_answer(question)
        return answer
    except Exception as e:
        logger.error(f"Error during chatbot invocation: {e}")
        return _fallback_answer(question)
