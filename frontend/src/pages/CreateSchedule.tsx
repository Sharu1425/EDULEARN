import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, BookOpen, FileText, CheckCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import api from '../utils/api'
import { useToast } from '../contexts/ToastContext'
import AnimatedBackground from '../components/AnimatedBackground'

const CreateSchedule: React.FC = () => {
    const navigate = useNavigate()
    const { success, error: showError } = useToast()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: Subject/Files, 2: Pattern
    const [batches, setBatches] = useState<{ id: string; name: string }[]>([])

    const SUBJECTS = ["C", "C++", "Java", "Python", "ML", "OODP", "DSA", "DAA", "DBMS", "Networks"]
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    const [formData, setFormData] = useState({
        batch_id: '',
        subject: '',
        customSubject: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: '10:00',
        days_of_week: ['Monday', 'Wednesday', 'Friday'],
    })

    const [files, setFiles] = useState<{
        handout: File | null,
        syllabus: File | null
    }>({
        handout: null,
        syllabus: null
    })

    useEffect(() => {
        fetchBatches()
    }, [])

    const fetchBatches = async () => {
        try {
            const res = await api.get('/api/teacher/batches')
            // Backend returns { id: string, name: string, ... }
            const batchData = res.data.map((b: any) => ({ id: b.id, name: b.name }))
            setBatches(batchData)
            if (batchData.length > 0) {
                setFormData(prev => ({ ...prev, batch_id: batchData[0].id }))
            }
        } catch (err) {
            console.error(err)
            showError("Error", "Failed to fetch batches")
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleDayToggle = (day: string) => {
        setFormData(prev => {
            const days = prev.days_of_week.includes(day)
                ? prev.days_of_week.filter(d => d !== day)
                : [...prev.days_of_week, day]
            return { ...prev, days_of_week: days }
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'handout' | 'syllabus') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!files.handout) {
            showError("Missing File", "Course Handout is required to generate the schedule.")
            return
        }

        const finalSubject = formData.subject === 'Other' ? formData.customSubject : formData.subject
        if (!finalSubject) {
            showError("Missing Subject", "Please select or enter a subject.")
            return
        }

        setLoading(true)

        try {
            const payload = new FormData()
            payload.append('handout_file', files.handout)
            if (files.syllabus) {
                payload.append('syllabus_file', files.syllabus)
            }
            payload.append('subject', finalSubject)
            payload.append('batch_id', formData.batch_id)
            payload.append('start_date', formData.start_date)
            payload.append('start_time', formData.start_time)
            payload.append('days_of_week', formData.days_of_week.join(','))

            const response = await api.post('/api/schedule/generate-from-handout', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            success("Schedule Created", response.data.message)
            navigate('/teacher-dashboard')

        } catch (err: any) {
            console.error("Generate schedule error", err)
            showError("Error", err.response?.data?.detail || "Failed to generate schedule")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black relative overflow-hidden text-white font-sans">
            {/* Background */}
            <div className="absolute inset-0 z-0 opacity-40">
                <AnimatedBackground />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">

                <div className="w-full max-w-4xl mx-auto mb-6">
                    <Button variant="ghost" onClick={() => navigate('/teacher-dashboard')} className="text-gray-400 hover:text-white flex items-center">
                        <ArrowLeft className="mr-2 w-4 h-4" /> Back to Dashboard
                    </Button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
                >
                    <div className="p-8 md:p-12 border-b border-gray-800">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
                            Create Course Schedule
                        </h1>
                        <p className="text-gray-400 text-lg">AI-powered schedule generation from your course materials.</p>
                    </div>

                    <div className="p-8 md:p-12">
                        <form onSubmit={handleSubmit}>
                            {/* Step Indicator */}
                            <div className="flex items-center justify-center mb-12">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${step >= 1 ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20' : 'border-gray-700 bg-gray-800 text-gray-500'} font-bold text-lg transition-all`}>1</div>
                                <div className={`w-24 h-1 mx-4 rounded-full ${step >= 2 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-800'}`} />
                                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${step >= 2 ? 'border-purple-500 bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/20' : 'border-gray-700 bg-gray-800 text-gray-500'} font-bold text-lg transition-all`}>2</div>
                            </div>

                            <AnimatePresence mode="wait">
                                {step === 1 ? (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Batch Selection */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Target Batch</label>
                                                <div className="relative">
                                                    <select
                                                        name="batch_id"
                                                        value={formData.batch_id}
                                                        onChange={handleChange}
                                                        className="w-full pl-4 pr-10 py-4 bg-black/40 border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white appearance-none outline-none transition-all cursor-pointer hover:border-gray-600"
                                                        required
                                                    >
                                                        <option value="" disabled>Select a batch</option>
                                                        {batches.filter(b => b.id !== 'all').map(batch => (
                                                            <option key={batch.id} value={batch.id} className="bg-gray-900">{batch.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Subject Selection */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Subject</label>
                                                <div className="relative mb-3">
                                                    <select
                                                        name="subject"
                                                        value={formData.subject}
                                                        onChange={handleChange}
                                                        className="w-full pl-4 pr-10 py-4 bg-black/40 border border-gray-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white appearance-none outline-none transition-all cursor-pointer hover:border-gray-600"
                                                        required
                                                    >
                                                        <option value="" disabled>Select Subject</option>
                                                        {SUBJECTS.map(sub => (
                                                            <option key={sub} value={sub} className="bg-gray-900">{sub}</option>
                                                        ))}
                                                        <option value="Other" className="bg-gray-900">Other (Custom)</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                                {formData.subject === 'Other' && (
                                                    <motion.input
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        type="text"
                                                        name="customSubject"
                                                        value={formData.customSubject}
                                                        onChange={handleChange}
                                                        placeholder="Enter custom subject name"
                                                        className="w-full px-4 py-3 bg-black/40 border border-purple-500/50 rounded-xl focus:border-purple-500 text-white placeholder-gray-600 outline-none"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Files Upload Area */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Course Materials</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Syllabus */}
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        id="syllabus-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(e, 'syllabus')}
                                                        accept=".pdf,.doc,.docx,.txt"
                                                    />
                                                    <label
                                                        htmlFor="syllabus-upload"
                                                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                                                        ${files.syllabus
                                                                ? 'border-blue-500/50 bg-blue-500/10'
                                                                : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}`}
                                                    >
                                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg
                                                            ${files.syllabus ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                                            <BookOpen className="w-8 h-8" />
                                                        </div>
                                                        <span className="text-lg font-medium text-white mb-1">
                                                            {files.syllabus ? "Syllabus Uploaded" : "Upload Syllabus"}
                                                        </span>
                                                        <span className="text-sm text-gray-500 max-w-[200px] truncate">
                                                            {files.syllabus ? files.syllabus.name : "Optional (PDF, Doc)"}
                                                        </span>
                                                    </label>
                                                </div>

                                                {/* Handout */}
                                                <div className="relative group">
                                                    <input
                                                        type="file"
                                                        id="handout-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(e, 'handout')}
                                                        accept=".pdf,.doc,.docx,.txt"
                                                    />
                                                    <label
                                                        htmlFor="handout-upload"
                                                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                                                        ${files.handout
                                                                ? 'border-green-500/50 bg-green-500/10'
                                                                : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}`}
                                                    >
                                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg
                                                            ${files.handout ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                                                            <FileText className="w-8 h-8" />
                                                        </div>
                                                        <span className="text-lg font-medium text-white mb-1">
                                                            {files.handout ? "Handout Uploaded" : "Upload Handout *"}
                                                        </span>
                                                        <span className="text-sm text-gray-500 max-w-[200px] truncate">
                                                            {files.handout ? files.handout.name : "Required for AI Generation"}
                                                        </span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-8">
                                            <Button
                                                type="button"
                                                variant="primary"
                                                onClick={() => setStep(2)}
                                                disabled={!files.handout || !formData.subject || (!formData.subject && !formData.customSubject)}
                                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/20 text-lg"
                                            >
                                                Next Step
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-8"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Start Date</label>
                                                <input
                                                    type="date"
                                                    name="start_date"
                                                    value={formData.start_date}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-4 bg-black/40 border border-gray-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white appearance-none outline-none transition-all cursor-pointer [color-scheme:dark]"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Class Time</label>
                                                <input
                                                    type="time"
                                                    name="start_time"
                                                    value={formData.start_time}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-4 bg-black/40 border border-gray-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white appearance-none outline-none transition-all cursor-pointer [color-scheme:dark]"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Class Days</label>
                                            <div className="flex flex-wrap gap-3">
                                                {DAYS.map(day => (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => handleDayToggle(day)}
                                                        className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 border transform active:scale-95
                                                        ${formData.days_of_week.includes(day)
                                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/25 scale-105'
                                                                : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-8 border-t border-gray-800 mt-8">
                                            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={loading} className="text-gray-400 hover:text-white">
                                                Go Back
                                            </Button>
                                            <Button
                                                type="submit"
                                                variant="primary"
                                                disabled={loading || formData.days_of_week.length === 0}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-10 py-4 rounded-xl shadow-xl shadow-green-500/20 text-lg font-bold"
                                            >
                                                {loading ? (
                                                    <span className="flex items-center">
                                                        <Upload className="w-5 h-5 mr-3 animate-spin" />
                                                        Generating Schedule...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center">
                                                        <CheckCircle className="w-5 h-5 mr-3" />
                                                        Generate Schedule
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default CreateSchedule
