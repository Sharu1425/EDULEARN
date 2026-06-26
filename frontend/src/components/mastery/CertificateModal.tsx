import React, { useRef } from "react"
import { X, Download, Award } from "lucide-react"
import Overlay from "../ui/Overlay"
import Button from "../ui/Button"

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
    date,
}) => {
    const certificateRef = useRef<HTMLDivElement>(null)

    const handlePrint = () => {
        const printWindow = window.open("", "_blank")
        if (!printWindow) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>Certificate of Completion</title>
                    <style>
                        body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f4f8; -webkit-print-color-adjust: exact; color-adjust: exact; }
                        .cert-container { border: 20px solid #e2e8f0; background: #ffffff; padding: 40px; width: 800px; height: 550px; text-align: center; box-sizing: border-box; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                        .cert-inner { border: 2px solid #cbd5e1; height: 100%; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center; }
                        .cert-title { font-size: 42px; font-weight: 800; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 4px; }
                        .cert-subtitle { font-size: 18px; color: #64748b; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 2px; }
                        .cert-presented { font-size: 16px; color: #475569; margin-bottom: 20px; }
                        .cert-name { font-size: 48px; font-weight: 700; color: #3b82f6; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; width: 80%; }
                        .cert-reason { font-size: 18px; color: #475569; margin-bottom: 20px; max-width: 600px; line-height: 1.6; }
                        .cert-topic { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 40px; }
                        .cert-footer { display: flex; justify-content: space-between; align-items: flex-end; width: 80%; margin: 20px auto 0 auto; }
                        .cert-date, .cert-signature { text-align: center; width: 200px; }
                        .cert-line { border-bottom: 1px solid #94a3b8; margin-bottom: 10px; height: 30px; display: flex; align-items: flex-end; justify-content: center; font-weight: bold; color: #0f172a; }
                        .cert-label { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
                        .cert-badge { width: 80px; height: 80px; background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3); border: 4px solid white; flex-shrink: 0; margin: 0 20px; }
                        @media print { body { background: white; } .cert-container { box-shadow: none; border-color: #cbd5e1; } }
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
                    <script>window.onload = () => { window.print(); }</script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <Overlay isOpen={isOpen} onClose={onClose} className="max-w-4xl">
            <div className="glass flex flex-col overflow-hidden rounded-3xl shadow-e4 dark:shadow-e4-dark">
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
                    <h3 className="flex items-center gap-2 font-heading font-bold text-foreground">
                        <Award className="h-5 w-5 text-amber-500" />
                        Your Mastery Certificate
                    </h3>
                    <div className="flex items-center gap-3">
                        <Button variant="primary" size="sm" onClick={handlePrint}>
                            <Download className="h-4 w-4" /> Download / Print
                        </Button>
                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Certificate preview (intentionally formal/white) */}
                <div className="flex max-h-[70vh] justify-center overflow-auto bg-muted/40 p-6 md:p-10">
                    <div
                        ref={certificateRef}
                        className="relative aspect-[1.4/1] w-full max-w-[800px] flex-shrink-0 overflow-hidden border-8 border-slate-200 bg-white text-slate-900 shadow-2xl"
                        style={{ padding: "24px" }}
                    >
                        <div className="relative flex h-full w-full flex-col items-center justify-center border border-slate-300 bg-white p-8 text-center">
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
                                <Award className="h-[400px] w-[400px]" />
                            </div>

                            <div className="relative z-10 flex h-full w-full flex-col items-center justify-between py-4">
                                <div>
                                    <h1 className="mb-2 font-serif text-3xl font-black uppercase tracking-[0.1em] text-slate-800 sm:text-4xl md:text-5xl">
                                        Certificate of Mastery
                                    </h1>
                                    <h2 className="mb-6 text-sm uppercase tracking-widest text-slate-500 sm:text-base">EduLearn Excellence Award</h2>
                                </div>

                                <div className="flex w-full flex-col items-center">
                                    <p className="mb-4 text-sm italic text-slate-600 sm:text-base">This certificate is proudly presented to</p>
                                    <div className="mb-6 w-3/4 border-b-2 border-slate-200 pb-2 text-center">
                                        <span className="font-serif text-3xl font-bold text-blue-600 sm:text-4xl">{studentName || "Student"}</span>
                                    </div>
                                    <p className="mx-auto mb-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
                                        for successfully completing and demonstrating mastery in the topic of
                                    </p>
                                    <h3 className="mb-8 text-2xl font-bold text-slate-800 sm:text-3xl">{topicName}</h3>
                                </div>

                                <div className="mx-auto mt-auto flex w-[90%] items-end justify-between">
                                    <div className="flex w-32 flex-col items-center sm:w-40">
                                        <div className="w-full border-b border-slate-400 pb-1 text-center text-sm font-bold text-slate-800 sm:text-base">{date.toLocaleDateString()}</div>
                                        <span className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs">Date Completed</span>
                                    </div>
                                    <div className="z-20 mx-4 flex h-16 w-16 flex-shrink-0 translate-y-2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg sm:h-20 sm:w-20">
                                        <Award className="h-8 w-8 sm:h-10 sm:w-10" />
                                    </div>
                                    <div className="flex w-32 flex-col items-center sm:w-40">
                                        <div className="w-full border-b border-slate-400 pb-1 text-center font-bold text-blue-600" style={{ fontFamily: "cursive", fontSize: "1.1rem" }}>EduLearn</div>
                                        <span className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 sm:text-xs">Authorized Signature</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Overlay>
    )
}

export default CertificateModal
