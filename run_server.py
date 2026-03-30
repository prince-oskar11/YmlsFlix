repeat(auto-fill, minmax(150px, 1fr)); 
    gap: 20px; 
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.genre-btn-active { 
    background: #ef4444 !important; 
    border-color: #ffffff !important; 
    transform: scale(0.95);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
    color: white !important;
}

/* SHIMMER LOADING EFFECTS */
.shimmer {
    background: linear-gradient(90deg, #0f1117 25%, #1a1c23 50%, #0f1117 75%);
    background-size: 200% 100%;
    animation: shimmer-load 1.5s infinite;
}

@keyframes shimmer-load {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* END OF STYLESHEET CORE ENGINE */.
