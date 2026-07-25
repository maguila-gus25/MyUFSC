"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { Course } from "@/types/curriculum"
import { useDependencyGraph } from "@/hooks/useDependencyGraph"
import { useDashboardRef } from "@/hooks/useDashboardRef"
import ConnectionLines from "@/components/dependency-tree/ConnectionLines"
import CourseHighlighter from "@/components/dependency-tree/CourseHighlighter"
import InfoBanner from "@/components/dependency-tree/InfoBanner"

interface DependencyTreeProps {
  course: Course
  isVisible: boolean
  setDependencyState: React.Dispatch<React.SetStateAction<{ showDependencyTree: boolean; dependencyCourse: Course | null; }>>;
}

export default function DependencyTree({
  course,
  isVisible,
  setDependencyState,
}: DependencyTreeProps) {
  // Get the dependency graph data
  const {
    connections,
    prerequisiteCourses,
    dependentCourses,
    coursesDepth
  } = useDependencyGraph(course, isVisible)
  
  // Get the dashboard reference and course elements
  const {
    dashboardRef,
    courseElements,
    isReady
  } = useDashboardRef(course, isVisible)
  
  // Clean up when component unmounts or visibility changes
  useEffect(() => {
    return () => {
      if (dashboardRef.current) {
        // This cleanup happens on unmount
        cleanupDashboard()
      }
    }
  }, [])
  
  // When visibility changes to false, clean up
  useEffect(() => {
    if (!isVisible && dashboardRef.current) {
      cleanupDashboard()
    }
  }, [isVisible])
  
  // Handle global events
  useEffect(() => {
    if (!isVisible || !isReady) return

    // The tree persists through scrolling/panning; it is dismissed only by an
    // explicit click outside a course box (or the close button). Double-clicking
    // another course swaps the tree to that course instead of closing it.
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[data-course-id]') || target.closest('#dependency-close-button')) {
        return
      }
      setDependencyState({ showDependencyTree: false, dependencyCourse: null });
    }

    document.addEventListener('click', handleOutsideClick)

    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [isVisible, isReady, setDependencyState]) // Updated dependency array

  const cleanupDashboard = () => {
    // Remove dashboard highlights (kept minimal for essential cleanup)
    document.querySelectorAll('.panel').forEach(dashboard => {
      dashboard.classList.remove('ring-1', 'ring-inset', 'ring-blue-300')
      dashboard.querySelectorAll('#dashboard-overlay').forEach(overlay => overlay.remove())
    })
  }
  
  if (!isVisible) return null
  
  return (
    <>
      {isReady && (
        <>
          {/* Course Highlighter handles course highlighting */}
          <CourseHighlighter
            dashboardRef={dashboardRef}
            courseElements={courseElements}
            course={course}
            prerequisiteCourses={prerequisiteCourses}
            dependentCourses={dependentCourses}
            coursesDepth={coursesDepth}
          />
          
          {/* Connection Lines */}
          {createPortal(
            <ConnectionLines
              connections={connections}
              courseElements={courseElements}
            />,
            document.body
          )}
          
          {/* Info Banner */}
          {createPortal(
            <InfoBanner message="Clique fora para fechar" />,
            document.body
          )}
        </>
      )}
    </>
  )
}