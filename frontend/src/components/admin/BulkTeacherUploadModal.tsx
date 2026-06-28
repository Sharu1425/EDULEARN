import React, { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { bulkTeacherService, BulkTeacherUploadResponse } from '../../api/bulkTeacherService'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (res: BulkTeacherUploadResponse) => void
}

export const BulkTeacherUploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'select' | 'validate' | 'complete'>('select')
  const [validRows, setValidRows] = useState<number>(0)
  const [invalidRows, setInvalidRows] = useState<number>(0)
  const [totalRows, setTotalRows] = useState<number>(0)
  const [errors, setErrors] = useState<any[]>([])
  const [uploadResult, setUploadResult] = useState<BulkTeacherUploadResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
  }

  const onValidate = async () => {
    if (!file) return
    setLoading(true)
    try {
      const res = await bulkTeacherService.validate(file)
      setValidRows(res.valid_rows)
      setInvalidRows(res.invalid_rows)
      setTotalRows(res.total_rows)
      setErrors(res.errors)
      setStep('validate')
    } catch (e: any) {
      setError(e.message || 'Validation failed')
    } finally {
      setLoading(false)
    }
  }

  const onUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const res = await bulkTeacherService.upload(file)
      setUploadResult(res)
      setStep('complete')
      if (res.successful_imports > 0) onSuccess(res)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    bulkTeacherService.createTemplateCsv()
  }

  const close = () => {
    setFile(null)
    setStep('select')
    setErrors([])
    setUploadResult(null)
    setError(null)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => e.target === e.currentTarget && close()}>
        <motion.div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Teacher Upload</h2>
                <p className="text-gray-600 dark:text-gray-400">Add multiple teachers from an Excel/CSV file</p>
              </div>
              <Button variant="secondary" onClick={close} className="text-gray-400">✕</Button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {step === 'select' && (
              <div className="space-y-6">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Columns required: name, email, teacher_id</p>
                </div>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onSelectFile} />
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="w-10 h-10 text-green-500 mx-auto" />
                      <div className="text-gray-900 dark:text-white">{file.name}</div>
                      <Button variant="secondary" onClick={() => inputRef.current?.click()}>Choose Different File</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                      <Button onClick={() => inputRef.current?.click()} className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600">Select File</Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-2" /> Download Template
                  </Button>
                  {file && (
                    <Button onClick={onValidate} disabled={loading} className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600">
                      {loading ? (<><LoadingSpinner size="sm" /><span className="ml-2">Validating...</span></>) : 'Validate File'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {step === 'validate' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{totalRows}</div><div className="text-sm text-gray-500">Total Rows</div></Card>
                  <Card className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{validRows}</div><div className="text-sm text-gray-500">Valid Rows</div></Card>
                  <Card className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{invalidRows}</div><div className="text-sm text-gray-500">Errors</div></Card>
                </div>
                {errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 max-h-40 overflow-y-auto">
                    {errors.map((e, i) => (
                      <div key={i} className="text-sm text-red-600 dark:text-red-400">Row {e.row}: {(e.errors || []).join(', ') || e.error}</div>
                    ))}
                  </div>
                )}
                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => setStep('select')}>Back</Button>
                  <Button onClick={onUpload} disabled={loading || validRows === 0} className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600">
                    {loading ? (<><LoadingSpinner size="sm" /><span className="ml-2">Uploading...</span></>) : `Upload ${validRows} Teachers`}
                  </Button>
                </div>
              </div>
            )}

            {step === 'complete' && uploadResult && (
              <div className="space-y-6">
                <div className="text-center">
                  {uploadResult.successful_imports > 0 ? (
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  )}
                  <div className="text-gray-700 dark:text-gray-300">{uploadResult.successful_imports} created, {uploadResult.failed_imports} failed.</div>
                </div>
                {uploadResult.created_teachers.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 max-h-40 overflow-y-auto">
                    {uploadResult.created_teachers.map((t, i) => (
                      <div key={i} className="text-sm text-green-700 dark:text-green-400">{t.name} ({t.teacher_id}) - {t.email}</div>
                    ))}
                  </div>
                )}
                {uploadResult.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 max-h-40 overflow-y-auto">
                    {uploadResult.errors.map((e, i) => (
                      <div key={i} className="text-sm text-red-600 dark:text-red-400">Row {e.row}: {(e.errors || []).join(', ') || e.error}</div>
                    ))}
                  </div>
                )}
                <div className="flex justify-center">
                  <Button onClick={close} className="bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600">Done</Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BulkTeacherUploadModal


