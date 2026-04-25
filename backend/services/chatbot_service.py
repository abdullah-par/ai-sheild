import os
import logging
from typing import Optional
from dotenv import load_dotenv

try:
    from langchain_groq import ChatGroq
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain.prompts import PromptTemplate
    from langchain.chains import RetrievalQA
    from langchain_community.vectorstores import FAISS
    LANGCHAIN_IMPORT_ERROR = None
except Exception as import_error:
    ChatGroq = None
    HuggingFaceEmbeddings = None
    PromptTemplate = None
    RetrievalQA = None
    FAISS = None
    LANGCHAIN_IMPORT_ERROR = str(import_error)

load_dotenv()

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")
CSV_DATA_PATH = os.path.join(DATA_DIR, "codejay_chatbot_full_dataset.csv")

# ── Global Instances ────────────────────────────
_qa_chain = None
_embedder = None

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

    groq_api_key = os.getenv("groq_api_key")
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
        return "I'm sorry, my AI brain is currently disconnected (missing API key or model index). Please contact the administrator."
    
    try:
        response = chain.invoke({"query": question})
        return response.get('result', "I don't know.")
    except Exception as e:
        logger.error(f"Error during chatbot invocation: {e}")
        return "I encountered an error while processing your request."
