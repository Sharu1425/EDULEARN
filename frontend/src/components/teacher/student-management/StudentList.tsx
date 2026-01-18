/**
 * StudentList Component
 * Displays a list of students with search and filtering capabilities
 */
import React from "react"
import { motion } from "framer-motion"
import Card from "../../ui/Card"
import Button from "../../ui/Button"
import Input from "../../ui/Input"
import { ANIMATION_VARIANTS } from "../../../utils/constants"

interface Student {
  id: string
  name: string
  email: string
  progress: number
  lastActive: string
  batch?: string
  batchId?: string
  batchIds?: string[]
}

interface StudentListProps {
  students: Student[]
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedBatch: string
  onBatchChange: (batchId: string) => void
  batches: Array<{ id: string; name: string; studentCount: number }>
  onStudentClick: (student: Student) => void
  onAddStudent: (batchId: string) => void
  onRemoveStudent: (studentId: string, batchId: string) => void
  onBulkUpload: (batchId: string, batchName: string) => void
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  searchTerm,
  onSearchChange,
  selectedBatch,
  onBatchChange,
  batches,
  onStudentClick,
  onAddStudent,
  onBulkUpload
}) => {
  // Filter students based on search term and selected batch
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())

    // Check if student is in the selected batch
    // Support both single batchId and multiple batchIds array
    const matchesBatch = selectedBatch === "all" ||
      student.batchId === selectedBatch ||
      (Array.isArray((student as any).batchIds) && (student as any).batchIds.includes(selectedBatch))

    return matchesSearch && matchesBatch
  })

  return (
    <motion.div variants={ANIMATION_VARIANTS.slideUp}>
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 md:mb-0">Students</h2>

          <div className="flex space-x-3">
            <Button
              variant="primary"
              onClick={() => onAddStudent(selectedBatch)}
              className="text-sm"
            >
              Add Student
            </Button>
            {selectedBatch !== "all" && (
              <Button
                variant="secondary"
                onClick={() => {
                  const batch = batches.find(b => b.id === selectedBatch)
                  if (batch) {
                    onBulkUpload(selectedBatch, batch.name)
                  }
                }}
                className="text-sm"
              >
                Bulk Upload
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex space-x-2">
              <select
                value={selectedBatch}
                onChange={(e) => onBatchChange(e.target.value)}
                className="px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Students</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({batch.studentCount})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <motion.div
              key={student.id}
              variants={ANIMATION_VARIANTS.fadeIn}
              whileHover={{ scale: 1.02 }}
              className="bg-muted/30 border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onStudentClick(student)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {student.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">{student.email}</p>
                  {student.batch && (
                    <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {student.batch}
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">
                    Progress: {student.progress}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last active: {new Date(student.lastActive).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${student.progress}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-foreground text-lg mb-2">
              {searchTerm || selectedBatch !== "all"
                ? "No students found matching your criteria"
                : "No students found"
              }
            </div>
            <p className="text-muted-foreground text-sm">
              {searchTerm || selectedBatch !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Add students to get started"
              }
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export default StudentList
