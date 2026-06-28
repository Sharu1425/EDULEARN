"use client"

import React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useToast } from "../contexts/ToastContext"
import { useAuth } from "../hooks/useAuth"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import Input from "../components/ui/Input"
import ConfirmDialog from "../components/ui/ConfirmDialog"
import BatchPerformanceControl from "../components/teacher/BatchPerformanceControl"
import AIStudentReports from "../components/teacher/AIStudentReports"
import { BulkUploadModal } from "../components/BulkUploadModal"
import {
  StudentList,
  BatchGrid,
  StudentDetailsModal,
  BatchAssignmentModal,
  BatchChangeModal,
  StudentStats
} from "../components/teacher/student-management"
import api from "../utils/api"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface Student {
  id: string
  name: string
  email: string
  progress: number
  lastActive: string
  batch?: string
  batchId?: string
  batchIds?: string[]
  level?: number
  xp?: number
  badges?: string[]
  completedAssessments?: number
  averageScore?: number
}

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
  students?: Student[]
}

const StudentManagement: React.FC = () => {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [newBatchName, setNewBatchName] = useState("")
  const [showCreateBatch, setShowCreateBatch] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState<string | null>(null)
  const [studentEmail, setStudentEmail] = useState("")
  const [studentName, setStudentName] = useState("")
  const [addingStudent, setAddingStudent] = useState(false)
  const [showBatchAssignmentModal, setShowBatchAssignmentModal] = useState(false)
  const [selectedStudentsForBatch, setSelectedStudentsForBatch] = useState<string[]>([])
  const [targetBatchId, setTargetBatchId] = useState<string>("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null)
  const [deletingBatch, setDeletingBatch] = useState(false)
  const [batchAssignmentSearchTerm, setBatchAssignmentSearchTerm] = useState("")
  const [showBatchChangeModal, setShowBatchChangeModal] = useState(false)
  const [selectedStudentForBatchChange, setSelectedStudentForBatchChange] = useState<Student | null>(null)
  const [newBatchId, setNewBatchId] = useState<string>("")
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false)
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null)
  const [showBatchPerformance, setShowBatchPerformance] = useState(false)
  const [showAIReports, setShowAIReports] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [bulkUploadBatchId, setBulkUploadBatchId] = useState<string | null>(null)
  const [bulkUploadBatchName, setBulkUploadBatchName] = useState<string>("")

  // Early return if user is not available
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your dashboard.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch students from API
      const studentsResponse = await api.get("/api/teacher/students")
      if (studentsResponse.data.success) {
        setStudents(studentsResponse.data.students)
      } else {
        console.warn("⚠️ [STUDENT MANAGEMENT] No students data received")
        setStudents([])
      }
      
      // Fetch batches from API
      const batchesResponse = await api.get("/api/teacher/batches")
      if (batchesResponse.data && Array.isArray(batchesResponse.data)) {
        // Add "All Students" option
        const formattedBatches = batchesResponse.data.map((batch: any) => ({
          id: batch.id,
          name: batch.name,
          studentCount: batch.student_count || 0,
          createdAt: batch.created_at
        }))
        setBatches(formattedBatches)
      } else {
        console.warn("⚠️ [STUDENT MANAGEMENT] No batches data received")
        setBatches([])
      }
      
    } catch (error) {
      console.error("❌ [STUDENT MANAGEMENT] Error fetching dashboard data:", error)
      showError("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) {
      showError("Please enter a batch name")
      return
    }

    try {
      const response = await api.post("/api/teacher/batches", {
        name: newBatchName.trim(),
        description: `Batch created on ${new Date().toLocaleDateString()}`
      })

      if (response.data.success) {
        success(`Batch "${newBatchName}" created successfully`)
        setNewBatchName("")
        setShowCreateBatch(false)
        fetchDashboardData()
      } else {
        showError("Failed to create batch")
      }
    } catch (error) {
      console.error("❌ [STUDENT MANAGEMENT] Error creating batch:", error)
      showError("Failed to create batch")
    }
  }

  const handleAddStudent = async (batchId: string) => {
    if (!studentEmail.trim()) {
      showError("Please enter student email")
      return
    }

    try {
      setAddingStudent(true)
      const response = await api.post("/api/teacher/students/add", {
        email: studentEmail.trim(),
        name: studentName.trim() || studentEmail.split("@")[0],
        batch_id: batchId
      })

      if (response.data.success) {
        success(response.data.message)
        setStudentEmail("")
        setStudentName("")
        setShowAddStudent(null)
        fetchDashboardData()
      } else {
        showError("Failed to add student")
      }
    } catch (error) {
      console.error("❌ [STUDENT MANAGEMENT] Error adding student:", error)
      showError("Failed to add student")
    } finally {
      setAddingStudent(false)
    }
  }

  const handleDeleteBatch = (batchId: string) => {
    setBatchToDelete(batchId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return

    setDeletingBatch(true)
    try {
      const response = await api.delete(`/api/teacher/batches/${batchToDelete}`)
      
      if (response.data.success) {
        success("Batch Deleted", "Batch deleted successfully and students have been unassigned")
        fetchDashboardData()
        setShowDeleteConfirm(false)
        setBatchToDelete(null)
      } else {
        showError("Delete Failed", "Failed to delete batch")
      }
    } catch (error) {
      console.error("❌ [STUDENT MANAGEMENT] Error deleting batch:", error)
      showError("Delete Failed", "Failed to delete batch")
    } finally {
      setDeletingBatch(false)
    }
  }

  const handleAssignStudents = async (studentIds: string[], batchId: string) => {
    try {
      // Implementation for assigning students to batch
      success(`Assigned ${studentIds.length} students to batch`)
      fetchDashboardData()
    } catch (error) {
      console.error("❌ [STUDENT MANAGEMENT] Error assigning students:", error)
      showError("Failed to assign students")
    }
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudentForDetails(student)
    setShowStudentDetailsModal(true)
  }

  const handleChangeBatch = (student: Student) => {
    setSelectedStudentForBatchChange(student)
    setShowBatchChangeModal(true)
  }

  const handleRemoveStudent = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    
    // Get batch IDs - support multi-batch
    const batchIds = (student as any)?.batchIds || (student?.batchId ? [student.batchId] : []);
    
    if (batchIds.length === 0) {
      showError("Cannot Remove", "This student is not assigned to any batch.");
      return;
    }

    // If student is in multiple batches, ask which one to remove from
    let batchIdToRemove: string;
    if (batchIds.length > 1) {
      const batchNames = batchIds.map((bid: string) => {
        const batch = batches.find(b => b.id === bid);
        return batch?.name || bid;
      }).join(", ");
      const userChoice = confirm(
        `This student is in multiple batches: ${batchNames}\n\n` +
        `Do you want to remove from the first batch (${batches.find(b => b.id === batchIds[0])?.name || batchIds[0]})?`
      );
      if (!userChoice) return;
      batchIdToRemove = batchIds[0];
    } else {
      if (!confirm("Are you sure you want to remove this student from their batch?")) {
        return;
      }
      batchIdToRemove = batchIds[0];
    }

    try {
      const response = await api.post("/api/teacher/students/remove", {
        student_id: studentId,
        batch_id: batchIdToRemove
      });

      if (response.data.success) {
        success("Student removed successfully", response.data.message);
        fetchDashboardData(); // Refresh all data
        setShowStudentDetailsModal(false); // Close modal after removal
      } else {
        showError("Failed to remove student", response.data.message || "An error occurred.");
      }
    } catch (error: any) {
      console.error("❌ [STUDENT MANAGEMENT] Error removing student:", error);
      showError("Failed to remove student", error.response?.data?.detail || "An error occurred.");
    }
  }

  const handleBulkUpload = (batchId: string, batchName: string) => {
    setBulkUploadBatchId(batchId)
    setBulkUploadBatchName(batchName)
    setShowBulkUploadModal(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          <p className="text-muted-foreground">Please wait while we load your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-6 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={ANIMATION_VARIANTS.container}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={ANIMATION_VARIANTS.slideUp} className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Student Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage students, batches, and track performance
            </p>
          </motion.div>

          {/* Statistics */}
          <StudentStats
            students={students}
            batches={batches}
          />

          {/* Batches */}
          <div className="mb-8">
            <BatchGrid
              batches={batches}
              onCreateBatch={() => setShowCreateBatch(true)}
              onBatchClick={(batch) => console.log("Batch clicked:", batch)}
              onDeleteBatch={handleDeleteBatch}
              onAddStudentToBatch={(batchId) => setShowAddStudent(batchId)}
              onBulkUploadToBatch={handleBulkUpload}
            />
          </div>

          {/* Students */}
          <StudentList
            students={students}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedBatch={selectedBatch}
            onBatchChange={setSelectedBatch}
            batches={batches}
            onStudentClick={handleStudentClick}
            onAddStudent={(batchId) => setShowAddStudent(batchId)}
            onRemoveStudent={handleRemoveStudent}
            onBulkUpload={handleBulkUpload}
          />

          {/* Create Batch Modal */}
          {showCreateBatch && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="p-6 max-w-md w-full">
                <h2 className="text-2xl font-bold text-foreground mb-4">Create New Batch</h2>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Batch name"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                  />
                  <div className="flex space-x-3">
                    <Button onClick={handleCreateBatch} variant="primary">
                      Create Batch
                    </Button>
                    <Button onClick={() => setShowCreateBatch(false)} variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Add Student Modal */}
          {showAddStudent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="p-6 max-w-md w-full">
                <h2 className="text-2xl font-bold text-foreground mb-4">Add Student</h2>
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Student name (optional)"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Student email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => handleAddStudent(showAddStudent)} 
                      variant="primary"
                      disabled={addingStudent}
                    >
                      {addingStudent ? "Adding..." : "Add Student"}
                    </Button>
                    <Button onClick={() => setShowAddStudent(null)} variant="ghost">
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Modals */}
          <StudentDetailsModal
            student={selectedStudentForDetails}
            isOpen={showStudentDetailsModal}
            onClose={() => setShowStudentDetailsModal(false)}
            onChangeBatch={handleChangeBatch}
            onRemoveStudent={handleRemoveStudent}
          />

          <BatchChangeModal
            student={selectedStudentForBatchChange}
            batches={batches}
            isOpen={showBatchChangeModal}
            onClose={() => {
              setShowBatchChangeModal(false)
              setSelectedStudentForBatchChange(null)
            }}
            onSuccess={() => {
              fetchDashboardData()
              setShowStudentDetailsModal(false) // Close details modal after batch change
            }}
          />

          <BatchAssignmentModal
            isOpen={showBatchAssignmentModal}
            onClose={() => setShowBatchAssignmentModal(false)}
            students={students}
            batches={batches}
            onAssignStudents={handleAssignStudents}
          />

          {/* Existing Modals */}
          {showBatchPerformance && (
            <BatchPerformanceControl
              isOpen={showBatchPerformance}
              onClose={() => setShowBatchPerformance(false)}
            />
          )}

          {showAIReports && (
            <AIStudentReports
              isOpen={showAIReports}
              onClose={() => setShowAIReports(false)}
            />
          )}

          {showBulkUploadModal && bulkUploadBatchId && (
            <BulkUploadModal
              isOpen={showBulkUploadModal}
              onClose={() => {
                setShowBulkUploadModal(false)
                setBulkUploadBatchId(null)
                setBulkUploadBatchName("")
              }}
              batchId={bulkUploadBatchId}
              batchName={bulkUploadBatchName}
              onSuccess={() => {
                fetchDashboardData()
                setShowBulkUploadModal(false)
                setBulkUploadBatchId(null)
                setBulkUploadBatchName("")
              }}
            />
          )}

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false)
              setBatchToDelete(null)
            }}
            onConfirm={confirmDeleteBatch}
            title="Delete Batch?"
            message="Are you sure you want to delete this batch? This will remove all students from the batch. This action cannot be undone."
            confirmText="Delete Batch"
            cancelText="Cancel"
            variant="danger"
            loading={deletingBatch}
          />
        </motion.div>
      </div>
    </>
  )
}

export default StudentManagement