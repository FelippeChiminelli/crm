import { useState } from 'react'
import { FiPlus, FiPackage, FiGrid, FiTool } from 'react-icons/fi'
import type { Product } from '../types'
import { useProductsLogic } from '../hooks/useProductsLogic'
import { useConfirm } from '../hooks/useConfirm'
import { ProductGrid } from '../components/produtos/ProductGrid'
import { ProductFilters } from '../components/produtos/ProductFilters'
import { ProductDetailsModal } from '../components/produtos/ProductDetailsModal'
import { ProductForm } from '../components/produtos/ProductForm'
import { ProductImportExport } from '../components/produtos/ProductImportExport'
import { CategoryManager } from '../components/produtos/CategoryManager'
import { formatCurrency } from '../utils/validation'
import { MainLayout } from '../components/layout/MainLayout'

export default function ProdutosPage() {
  const {
    products, loading, total, currentPage, pageSize,
    filters, stats, brands, categories,
    setFilters, setCurrentPage, refreshProducts,
    deleteProduct, exportToCSV, clearFilters, refreshCategories,
  } = useProductsLogic()

  const { confirm } = useConfirm()

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | undefined>()

  const handleView = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailsModal(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id)
    setShowFormModal(true)
    setShowDetailsModal(false)
  }

  const handleDelete = async (product: Product) => {
    const isService = (product.tipo || 'produto') === 'servico'
    const confirmed = await confirm({
      title: `Excluir ${isService ? 'Serviço' : 'Produto'}`,
      message: `Tem certeza que deseja excluir "${product.nome}"? Esta ação não pode ser desfeita.`,
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    })
    if (confirmed) {
      await deleteProduct(product.id)
      setShowDetailsModal(false)
    }
  }

  const handleCreate = () => {
    setEditingProductId(undefined)
    setShowFormModal(true)
  }

  const handleFormSuccess = () => {
    refreshProducts()
  }

  const handleCategoriesChange = () => {
    refreshCategories()
  }

  const totalPages = Math.ceil(total / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto bg-gray-50 scroll-smooth">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 lg:py-8">
          {/* Header */}
          <div className="mb-4 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center justify-between lg:justify-start gap-2 lg:gap-3">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="bg-orange-500 p-2 lg:p-3 rounded-lg flex-shrink-0">
                    <FiPackage size={20} className="text-white lg:hidden" />
                    <FiPackage size={28} className="text-white hidden lg:block" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl lg:text-3xl font-bold text-gray-900 truncate">Produtos e Serviços</h1>
                    <p className="text-xs lg:text-base text-gray-600 truncate hidden sm:block">Gerencie o catálogo de produtos e serviços</p>
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="flex lg:hidden items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm text-sm flex-shrink-0"
                >
                  <FiPlus size={18} />
                  <span>Novo</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FiGrid size={18} />
                  Categorias
                </button>
                <ProductImportExport
                  onExport={exportToCSV}
                  onImportSuccess={refreshProducts}
                />
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
                >
                  <FiPlus size={20} />
                  Novo Item
                </button>
              </div>
            </div>

            {/* Estatísticas */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
                <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate flex items-center gap-1">
                    <FiPackage size={14} className="flex-shrink-0" /> Produtos
                  </p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{stats.total_products}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate flex items-center gap-1">
                    <FiTool size={14} className="flex-shrink-0" /> Serviços
                  </p>
                  <p className="text-lg lg:text-2xl font-bold text-purple-600">{stats.total_services}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate">Valor em Estoque</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
                    {formatCurrency(stats.total_value)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate">Preço Médio</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900 truncate">
                    {formatCurrency(stats.average_price)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate">Em Promoção</p>
                  <p className="text-lg lg:text-2xl font-bold text-red-600">{stats.products_on_promotion}</p>
                </div>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="mb-4 lg:mb-6">
            <ProductFilters
              filters={filters}
              brands={brands}
              categories={categories}
              onFiltersChange={setFilters}
              onClear={clearFilters}
            />
          </div>

          {/* Grid de produtos */}
          <div className="mb-4 lg:mb-6">
            <ProductGrid
              products={products}
              loading={loading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Paginação */}
          {total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-lg shadow-sm px-3 lg:px-6 py-3 lg:py-4">
              <div className="text-xs lg:text-sm text-gray-700 text-center sm:text-left">
                <span className="font-semibold">{startItem}</span>-
                <span className="font-semibold">{endItem}</span> de{' '}
                <span className="font-semibold">{total}</span>
              </div>

              <div className="flex gap-1 lg:gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm"
                >
                  <span className="hidden sm:inline">Anterior</span>
                  <span className="sm:hidden">&lt;</span>
                </button>

                <div className="flex gap-1">
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNumber: number
                    if (totalPages <= 5) pageNumber = i + 1
                    else if (currentPage <= 3) pageNumber = i + 1
                    else if (currentPage >= totalPages - 2) pageNumber = totalPages - 4 + i
                    else pageNumber = currentPage - 2 + i

                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg transition-colors text-xs lg:text-sm min-w-[32px] lg:min-w-[40px] ${
                          currentPage === pageNumber
                            ? 'bg-orange-500 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs lg:text-sm"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <span className="sm:hidden">&gt;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modais */}
        {selectedProduct && (
          <ProductDetailsModal
            product={selectedProduct}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <ProductForm
          productId={editingProductId}
          categories={categories}
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleFormSuccess}
        />

        <CategoryManager
          categories={categories}
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          onCategoriesChange={handleCategoriesChange}
        />
      </div>
    </MainLayout>
  )
}
