/**
 * BatchGrid Component
 * Displays batches in a grid layout with management controls
 */
import React from "react"
import { motion } from "framer-motion"
import Card from "../../ui/Card"
import Button from "../../ui/Button"
import { ANIMATION_VARIANTS } from "../../../utils/constants"

interface Batch {
  id: string
  name: string
  studentCount: number
  createdAt: string
  students?: Array<{
    id: string
    name: string
    email: string
    progress: number
    lastActive: string
  }>
}

interface BatchGridProps {
  batches: Batch[]
  onCreateBatch: () => void
  onBatchClick: (batch: Batch) => void
  onDeleteBatch: (batchId: string) => void
  onAddStudentToBatch: (batchId: string) => void
  onBulkUploadToBatch: (batchId: string, batchName: string) => void
}

const BatchGrid: React.FC<BatchGridProps> = ({
  batches,
  onCreateBatch,
  onBatchClick,
  onDeleteBatch,
  onAddStudentToBatch,
  onBulkUploadToBatch
}) => {
  return (
    <motion.div variants={ANIMATION_VARIANTS.slideUp}>
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-4 md:mb-0">Batches</h2>
          
          <Button variant="primary" onClick={onCreateBatch}>
            Create New Batch
          </Button>
        </div>

        {/* Batch Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Batches</p>
                <p className="text-2xl font-bold text-foreground">{batches.length}</p>
              </div>
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm">📚</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Students</p>
                <p className="text-2xl font-bold text-foreground">
                  {batches.reduce((sum, batch) => sum + batch.studentCount, 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-primary text-sm">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg. Students/Batch</p>
                <p className="text-2xl font-bold text-foreground">
                  {batches.length > 0 
                    ? Math.round(batches.reduce((sum, batch) => sum + batch.studentCount, 0) / batches.length)
                    : 0
                  }
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-orange-600 dark:text-orange-400 text-sm">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <motion.div
              key={batch.id}
              variants={ANIMATION_VARIANTS.fadeIn}
              whileHover={{ scale: 1.02 }}
              className="bg-muted/30 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {batch.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Created: {new Date(batch.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">
                    {batch.studentCount} students
                  </div>
                </div>
              </div>
              
              {/* Batch Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBatchClick(batch)}
                  className="text-primary hover:text-primary/80 flex-1"
                >
                  View Details
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddStudentToBatch(batch.id)}
                  className="text-primary hover:text-primary/80"
                >
                  Add Student
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBulkUploadToBatch(batch.id, batch.name)}
                  className="text-primary hover:text-primary/80"
                >
                  Bulk Upload
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteBatch(batch.id)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {batches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-foreground text-lg mb-2">No batches found</div>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first batch to start organizing students
            </p>
            <Button variant="primary" onClick={onCreateBatch}>
              Create First Batch
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export default BatchGrid
