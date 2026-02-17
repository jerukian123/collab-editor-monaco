import { ref } from 'vue'

interface UseResizableOptions {
  initialWidth: number
  minWidth: number
  maxWidth: number
  direction: 'left' | 'right'
  onResize?: (width: number) => void
}

export function useResizable(options: UseResizableOptions) {
  const { minWidth, maxWidth, direction, onResize } = options
  const width = ref(options.initialWidth)
  const isDragging = ref(false)

  let startX = 0
  let startWidth = 0

  const onMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX
    const newWidth = direction === 'left'
      ? startWidth + delta
      : startWidth - delta
    width.value = Math.min(maxWidth, Math.max(minWidth, newWidth))
    onResize?.(width.value)
  }

  const onMouseUp = () => {
    isDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    isDragging.value = true
    startX = e.clientX
    startWidth = width.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  return { width, isDragging, handleMouseDown }
}
