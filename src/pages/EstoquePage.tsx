import { useState } from 'react'
import { FiPlus, FiPackage } from 'react-icons/fi'
import type { Vehicle } from '../types'
import { useVehiclesLogic } from '../hooks/useVehiclesLogic'
import { useConfirm } from '../hooks/useConfirm'
import { VehicleGrid } from '../components/estoque/VehicleGrid'
import { VehicleFilters } from '../components/estoque/VehicleFilters'
import { VehicleDetailsModal } from '../components/estoque/VehicleDetailsModal'
import { VehicleForm } from '../components/estoque/VehicleForm'
import { VehicleImportExport } from '../components/estoque/VehicleImportExport'
import { formatCurrency } from '../utils/validation'
import { MainLayout } from '../components/layout/MainLayout'

export default function EstoquePage() {
  const {
    vehicles,
    loading,
    total,
    currentPage,
    pageSize,
    filters,
    stats,
    brands,
    fuelTypes,
    transmissions,
    setFilters,
    setCurrentPage,
    refreshVehicles,
    deleteVehicle,
    exportToCSV,
    clearFilters
  } = useVehiclesLogic()

  const { confirm } = useConfirm()
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingVehicleId, setEditingVehicleId] = useState<string | undefined>()

  // Handlers
  const handleView = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setShowDetailsModal(true)
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id)
    setShowFormModal(true)
    setShowDetailsModal(false)
  }

  const handleDelete = async (vehicle: Vehicle) => {
    const confirmed = await confirm({
      title: 'Excluir Veículo',
      message: `Tem certeza que deseja excluir o veículo ${vehicle.marca_veiculo} ${vehicle.modelo_veiculo}? Esta ação não pode ser desfeita.`,
      type: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    })

    if (confirmed) {
      await deleteVehicle(vehicle.id)
      setShowDetailsModal(false)
    }
  }

  const handleCreate = () => {
    setEditingVehicleId(undefined)
    setShowFormModal(true)
  }

  const handleFormSuccess = () => {
    refreshVehicles()
  }

  const handleImportSuccess = () => {
    refreshVehicles()
  }

  // Paginação
  const totalPages = Math.ceil(total / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, total)

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto bg-gray-50 scroll-smooth">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-3 rounded-lg">
                <FiPackage size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Estoque de Veículos</h1>
                <p className="text-gray-600">Gerencie o estoque de veículos da sua loja</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <VehicleImportExport
                onExport={exportToCSV}
                onImportSuccess={handleImportSuccess}
              />
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
              >
                <FiPlus size={20} />
                Novo Veículo
              </button>
            </div>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Total de Veículos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_vehicles}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.total_value)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Preço Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.average_price)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <p className="text-sm text-gray-600 mb-1">Em Promoção</p>
                <p className="text-2xl font-bold text-red-600">{stats.vehicles_on_promotion}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <VehicleFilters
            filters={filters}
            brands={brands}
            fuelTypes={fuelTypes}
            transmissions={transmissions}
            onFiltersChange={setFilters}
            onClear={clearFilters}
          />
        </div>

        {/* Grid de veículos */}
        <div className="mb-6">
          <VehicleGrid
            vehicles={vehicles}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        {/* Paginação */}
        {total > 0 && (
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm px-6 py-4">
            <div className="text-sm text-gray-700">
              Mostrando <span className="font-semibold">{startItem}</span> a{' '}
              <span className="font-semibold">{endItem}</span> de{' '}
              <span className="font-semibold">{total}</span> veículos
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              {/* Números de página */}
              <div className="flex gap-1">
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNumber: number
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
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
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <VehicleForm
        vehicleId={editingVehicleId}
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleFormSuccess}
      />
      </div>
    </MainLayout>
  )
}

