"use client"

import type React from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import type { User } from "../types"
import { useTheme } from "../contexts/ThemeContext"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { ANIMATION_VARIANTS } from "../utils/constants"

interface AssessmentChoiceProps {
  user: User
}

const AssessmentChoice: React.FC<AssessmentChoiceProps> = ({ }) => {
  const { } = useTheme()

  return (
    <>
      <div className="px-4 py-6 sm:px-6">
        <motion.div
          variants={ANIMATION_VARIANTS.fadeIn}
          initial="initial"
          animate="animate"
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <motion.div variants={ANIMATION_VARIANTS.slideDown} className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Choose Your Assessment Type</h1>
            <p className="text-muted-foreground text-lg">
              Select the type of assessment you'd like to take today
            </p>
          </motion.div>

          {/* Assessment Options */}
          <motion.div variants={ANIMATION_VARIANTS.stagger} className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* MCQ Assessment */}
            <motion.div variants={ANIMATION_VARIANTS.slideLeft}>
              <Card className="p-8 h-full hover:border-teal-400/50 transition-all duration-300 group">
                <div className="text-center">
                  {/* Icon */}
                  <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="sr-only">MCQ Assessment</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">MCQ Assessment</h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    Test your theoretical knowledge with our AI-powered adaptive multiple-choice questions. Get
                    personalized questions that adapt to your skill level across various topics.
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">AI-powered adaptive questions</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Multiple topics & difficulty levels</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Instant results & explanations</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">15-30</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Minutes</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">5-25</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Questions</div>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <Link to="/assessconfig">
                    <Button variant="primary" className="w-full">
                      Start MCQ Assessment
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>

            {/* Coding Assessment */}
            <motion.div variants={ANIMATION_VARIANTS.slideRight}>
              <Card className="p-8 h-full hover:border-teal-400/50 transition-all duration-300 group">
                <div className="text-center">
                  {/* Icon */}
                  <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                      />
                    </svg>
                    <span className="sr-only">Coding Challenge</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Coding Challenge</h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    Practice your programming skills with AI-generated coding problems. Write code, test solutions, and
                    get detailed AI feedback on your implementation.
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">AI-generated original problems</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Multi-language support</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Real-time code execution</span>
                    </div>
                    <div className="flex items-center text-gray-800 dark:text-gray-200">
                      <svg
                        className="w-5 h-5 text-teal-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">Detailed AI code review</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">30-90</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Minutes</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">1-3</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Problems</div>
                      </div>
                    </div>
                  </div>

                  {/* Button */}
                  <Link to="/coding">
                    <Button variant="primary" className="w-full">
                      Start Coding Challenge
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          </motion.div>

          {/* Back Button */}
          <motion.div variants={ANIMATION_VARIANTS.slideUp} className="text-center">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}

export default AssessmentChoice
