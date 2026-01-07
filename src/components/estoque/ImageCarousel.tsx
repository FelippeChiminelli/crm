import { useState } from 'react'
import type { VehicleImage } from '../../types'
import { FiChevronLeft, FiChevronRight, FiX, FiMaximize2 } from 'react-icons/fi'

interface ImageCarouselProps {
  images: VehicleImage[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-200 flex items-center justify-center rounded-lg">
        <p className="text-gray-500">Sem imagens disponíveis</p>
      </div>
    )
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const goToImage = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <>
      {/* Carousel principal */}
      <div className="space-y-4">
        {/* Imagem principal */}
        <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden group">
          <img
            src={images[currentIndex].url}
            alt={`Imagem ${currentIndex + 1}`}
            className="w-full h-full object-contain"
          />

          {/* Contador */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-md text-sm">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Botão expandir */}
          <button
            onClick={() => setIsLightboxOpen(true)}
            className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-2 rounded-md hover:bg-opacity-90 transition-all"
          >
            <FiMaximize2 size={20} />
          </button>

          {/* Botões de navegação */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-3 rounded-full hover:bg-opacity-90 transition-all opacity-0 group-hover:opacity-100"
              >
                <FiChevronLeft size={24} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-3 rounded-full hover:bg-opacity-90 transition-all opacity-0 group-hover:opacity-100"
              >
                <FiChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-orange-500 ring-2 ring-orange-300'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4">
          {/* Botão fechar */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
          >
            <FiX size={32} />
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-md text-lg">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Imagem */}
          <img
            src={images[currentIndex].url}
            alt={`Imagem ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {/* Navegação */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-4 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
              >
                <FiChevronLeft size={36} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-4 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
              >
                <FiChevronRight size={36} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}

