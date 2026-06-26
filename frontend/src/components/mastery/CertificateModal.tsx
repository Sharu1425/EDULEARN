import React, { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Award } from "lucide-react"
import { useTheme } from "../../contexts/ThemeContext"
import { cn } from "../../lib/utils"

interface CertificateModalProps {
    isOpen: boolean
    onClose: () => void
    studentName: string
    topicName: string
    date: Date
}

const CertificateModal: React.FC<CertificateModalProps> = ({
    isOpen,
    onClose,
    studentName,
    topicName,
    date
}) => {
    const { colorScheme } = useTheme()
    const isDark = colorScheme === "dark"
    const certificateRef = useRef<HTMLDivElement>(null)

    const handlePrint = () => {
        // Simple print functionalilty
        const printContent = certificateRef.current
        if (!printContent) return

        // Create a temporary container for printing
        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate of Completion</title>
                    <style>
                        body {
                            margin: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: #f0f4f8;
                            -webkit-print-color-adjust: exact;
                            color-adjust: exact;
                        }
                        .cert-container {
                            border: 20px solid #e2e8f0;
                            background: #ffffff;
                            padding: 40px;
                            width: 800px;
                            height: 550px;
                            text-align: center;
                            box-sizing: border-box;
                            position: relative;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                        }
                        .cert-inner {
                            border: 2px solid #cbd5e1;
                            height: 100%;
                            padding: 20px;
                            box-sizing: border-box;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                        }
                        .cert-title {
                            font-size: 42px;
                            font-weight: 800;
                            color: #0f172a;
                            margin-bottom: 10px;
                            text-transform: uppercase;
                            letter-spacing: 4px;
                        }
                        .cert-subtitle {
                            font-size: 18px;
                            color: #64748b;
                            margin-bottom: 40px;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }
                        .cert-presented {
                            font-size: 16px;
                            color: #475569;
                            margin-bottom: 20px;
                        }
                        .cert-name {
                            font-size: 48px;
                            font-weight: 700;
                            color: #3b82f6;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #e2e8f0;
                            padding-bottom: 10px;
                            width: 80%;
                        }
                        .cert-reason {
                            font-size: 18px;
                            color: #475569;
                            margin-bottom: 20px;
                            max-width: 600px;
                            line-height: 1.6;
                        }
                        .cert-topic {
                            font-size: 24px;
                            font-weight: 700;
                            color: #0f172a;
                            margin-bottom: 40px;
                        }
                        .cert-footer {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-end;
                            width: 80%;
                            margin: 20px auto 0 auto;
                        }
                        .cert-date, .cert-signature {
                            text-align: center;
                            width: 200px;
                        }
                        .cert-line {
                            border-bottom: 1px solid #94a3b8;
                            margin-bottom: 10px;
                            height: 30px;
                            display: flex;
                            align-items: flex-end;
                            justify-content: center;
                            font-weight: bold;
                            color: #0f172a;
                        }
                        .cert-label {
                            font-size: 14px;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .cert-badge {
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 40px;
                            box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3);
                            border: 4px solid white;
                            flex-shrink: 0;
                            margin: 0 20px;
                        }
                        @media print {
                            body { background: white; }
                            .cert-container { box-shadow: none; border-color: #cbd5e1; }
                        }
                    </style>
                </head>
                <body>
                    <div class="cert-container">
                        <div class="cert-inner">
                            <div class="cert-title">Certificate of Mastery</div>
                            <div class="cert-subtitle">EduLearn Excellence Award</div>
                            
                            <div class="cert-presented">This certificate is proudly presented to</div>
                            <div class="cert-name">${studentName || "Student"}</div>
                            
                            <div class="cert-reason">for successfully completing and demonstrating mastery in the topic of</div>
                            <div class="cert-topic">${topicName}</div>
                            
                            <div class="cert-footer">
                                <div class="cert-date">
                                    <div class="cert-line">${date.toLocaleDateString()}</div>
                                    <div class="cert-label">Date Completed</div>
                                </div>
                                
                                <div class="cert-badge">★</div>
                                
                                <div class="cert-signature">
                                    <div class="cert-line" style="font-family: cursive; font-size: 24px; color: #3b82f6;">EduLearn</div>
                                    <div class="cert-label">Authorized Signature</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                        }
                    </script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className={cn(
                        "relative w-full max-w-4xl flex flex-col rounded-3xl overflow-hidden shadow-2xl",
                        isDark ? "bg-slate-900 border border-white/10" : "bg-white"
                    )}
                >
                    {/* Toolbar */}
                    <div className={cn(
                        "flex items-center justify-between px-6 py-4 border-b",
                        isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
                    )}>
                        <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                            <Award className="w-5 h-5 text-yellow-500" />
                            Your Mastery Certificate
                        </h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors text-sm"
                            >
                                <Download className="w-4 h-4" />
                                Download / Print
                            </button>
                            <button 
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                            </button>
                        </div>
                    </div>

                    {/* Certificate Preview container */}
                    <div className="p-6 md:p-10 flex justify-center bg-slate-100 dark:bg-slate-950 overflow-auto max-h-[70vh]">
                        
                        {/* THE CERTIFICATE (Visual representation for the UI) */}
                        <div 
                            ref={certificateRef}
                            className="relative w-full max-w-[800px] aspect-[1.4/1] bg-white text-slate-900 shadow-2xl overflow-hidden flex-shrink-0 border-8 border-slate-200"
                            style={{ padding: '24px' }}
                        >
                            {/* Inner border */}
                            <div className="w-full h-full border border-slate-300 flex flex-col items-center justify-center relative p-8 text-center bg-white">
                                
                                {/* Background Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <Award className="w-[400px] h-[400px]" />
                                </div>

                                <div className="relative z-10 flex flex-col items-center w-full h-full justify-between py-4">
                                    <div>
                                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 uppercase tracking-[0.1em] mb-2 font-serif">
                                            Certificate of Mastery
                                        </h1>
                                        <h2 className="text-sm sm:text-base text-slate-500 uppercase tracking-widest mb-6">
                                            EduLearn Excellence Award
                                        </h2>
                                    </div>
                                    
                                    <div className="flex flex-col items-center w-full">
                                        <p className="text-slate-600 text-sm sm:text-base italic mb-4">
                                            This certificate is proudly presented to
                                        </p>
                                        <div className="w-3/4 border-b-2 border-slate-200 pb-2 mb-6 text-center">
                                            <span className="text-3xl sm:text-4xl font-bold text-blue-600 font-serif">
                                                {studentName || "Student"}
                                            </span>
                                        </div>
                                        
                                        <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto mb-4 leading-relaxed">
                                            for successfully completing and demonstrating mastery in the topic of
                                        </p>
                                        
                                        <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-8">
                                            {topicName}
                                        </h3>
                                    </div>
                                    
                                    <div className="flex justify-between items-end w-[90%] mt-auto mx-auto">
                                        <div className="flex flex-col items-center w-32 sm:w-40">
                                            <div className="w-full border-b border-slate-400 text-center font-bold pb-1 text-slate-800 text-sm sm:text-base">
                                                {date.toLocaleDateString()}
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-2">
                                                Date Completed
                                            </span>
                                        </div>
                                        
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex flex-shrink-0 items-center justify-center text-white shadow-lg border-4 border-white z-20 translate-y-2 mx-4">
                                            <Award className="w-8 h-8 sm:w-10 sm:h-10" />
                                        </div>
                                        
                                        <div className="flex flex-col items-center w-32 sm:w-40">
                                            <div className="w-full border-b border-slate-400 text-center font-bold pb-1 text-blue-600" style={{ fontFamily: 'cursive', fontSize: '1.1rem' }}>
                                                EduLearn
                                            </div>
                                            <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mt-2">
                                                Authorized Signature
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default CertificateModal
