import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, CheckCircle, XCircle, AlertCircle, Users, FileSpreadsheet } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Toast from '../components/ui/Toast';
import { bulkStudentService, BulkUploadResponse, ValidationResponse } from '../api/bulkStudentService';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchName: string;
  onSuccess: (response: BulkUploadResponse) => void;
}

interface UploadStep {
  id: 'select' | 'validate' | 'upload' | 'complete';
  title: string;
  description: string;
}

const uploadSteps: UploadStep[] = [
  {
    id: 'select',
    title: 'Select File',
    description: 'Choose your Excel file with student data'
  },
  {
    id: 'validate',
    title: 'Validate Data',
    description: 'Review and validate student information'
  },
  {
    id: 'upload',
    title: 'Upload Students',
    description: 'Create student accounts'
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Review results and errors'
  }
];

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  batchId,
  batchName,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<UploadStep['id']>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setCurrentStep('select');
    setSelectedFile(null);
    setValidationResult(null);
    setUploadResult(null);
    setIsLoading(false);
    setError(null);
    setSendWelcomeEmails(true);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file format
    const validation = bulkStudentService.validateFileFormat(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file format');
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleValidateFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await bulkStudentService.validateFile(selectedFile);
      setValidationResult(result);
      
      if (result.valid_rows > 0) {
        setCurrentStep('validate');
      } else {
        setError('No valid student data found in the file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to validate file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadStudents = async () => {
    if (!selectedFile || !validationResult) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await bulkStudentService.uploadStudents(
        selectedFile,
        batchId,
        sendWelcomeEmails
      );
      
      setUploadResult(result);
      setCurrentStep('complete');
      
      if (result.successful_imports > 0) {
        onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    bulkStudentService.createTemplateFile();
  };

  const getStepIndex = (stepId: UploadStep['id']) => {
    return uploadSteps.findIndex(step => step.id === stepId);
  };

  const getCurrentStepIndex = () => getStepIndex(currentStep);

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {uploadSteps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = getCurrentStepIndex() > index;
        const isAccessible = index <= getCurrentStepIndex();

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isActive
                  ? 'bg-blue-500 text-white'
                  : isAccessible
                  ? 'bg-gray-300 text-gray-600'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-400">{step.description}</p>
            </div>
            {index < uploadSteps.length - 1 && (
              <div className={`w-8 h-0.5 mx-4 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Upload Student Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Upload an Excel file containing student information for <strong>{batchName}</strong>
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="space-y-4">
            <FileText className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm"
            >
              Choose Different File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Choose Excel File
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              Select File
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        <Button
          variant="secondary"
          onClick={handleDownloadTemplate}
          className="flex items-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Download Template</span>
        </Button>
      </div>

      {selectedFile && (
        <div className="flex justify-center">
          <Button
            onClick={handleValidateFile}
            disabled={isLoading}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Validating...</span>
              </>
            ) : (
              'Validate File'
            )}
          </Button>
        </div>
      )}
    </div>
  );

  const renderValidateStep = () => {
    if (!validationResult) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            File Validation Complete
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Review the validation results before proceeding
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {validationResult.total_rows}
            </div>
            <div className="text-sm text-gray-500">Total Rows</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {validationResult.valid_rows}
            </div>
            <div className="text-sm text-gray-500">Valid Students</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {validationResult.invalid_rows}
            </div>
            <div className="text-sm text-gray-500">Errors</div>
          </Card>
        </div>

        {validationResult.preview_data.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Preview Data (First 10 rows)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Roll Number</th>
                    <th className="text-left py-2 px-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {validationResult.preview_data.map((student, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3">{student.name}</td>
                      <td className="py-2 px-3">{student.roll_number}</td>
                      <td className="py-2 px-3">{student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {validationResult.errors.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-red-600 mb-3">
              Validation Errors
            </h4>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-40 overflow-y-auto">
              {validationResult.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-1">
                  Row {error.row}: {error.errors.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="sendEmails"
            checked={sendWelcomeEmails}
            onChange={(e) => setSendWelcomeEmails(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="sendEmails" className="text-sm text-gray-600 dark:text-gray-400">
            Send welcome emails to new students
          </label>
        </div>

        <div className="flex justify-center space-x-4">
          <Button
            variant="secondary"
            onClick={() => setCurrentStep('select')}
          >
            Back
          </Button>
          <Button
            onClick={handleUploadStudents}
            disabled={isLoading || validationResult.valid_rows === 0}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Uploading...</span>
              </>
            ) : (
              `Upload ${validationResult.valid_rows} Students`
            )}
          </Button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => {
    if (!uploadResult) return null;

    const successMessage = bulkStudentService.getSuccessMessage(uploadResult);
    const errorMessages = bulkStudentService.formatErrors(uploadResult.errors);

    return (
      <div className="space-y-6">
        <div className="text-center">
          {uploadResult.successful_imports > 0 ? (
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          )}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Upload Complete
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {successMessage}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {uploadResult.total_rows}
            </div>
            <div className="text-sm text-gray-500">Total Rows</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {uploadResult.successful_imports}
            </div>
            <div className="text-sm text-gray-500">Created</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {uploadResult.failed_imports}
            </div>
            <div className="text-sm text-gray-500">Failed</div>
          </Card>
        </div>

        {uploadResult.created_students.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Created Students
            </h4>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-h-40 overflow-y-auto">
              {uploadResult.created_students.map((student, index) => (
                <div key={index} className="text-sm text-green-600 dark:text-green-400 mb-1">
                  {student.name} ({student.roll_number}) - {student.email}
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMessages.length > 0 && (
          <div>
            <h4 className="text-lg font-medium text-red-600 mb-3">
              Errors
            </h4>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-40 overflow-y-auto">
              {errorMessages.map((error, index) => (
                <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-1">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            onClick={handleClose}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
          >
            Done
          </Button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'select':
        return renderSelectStep();
      case 'validate':
        return renderValidateStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Bulk Student Upload
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Add multiple students to {batchName}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </div>

            {renderStepIndicator()}

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {renderCurrentStep()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
