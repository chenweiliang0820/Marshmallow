import { useState } from 'react'
import { Link } from 'react-router-dom'
import { tools, categories } from '@/data/tools'

export default function ToolsList() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredTools =
    selectedCategory === 'all'
      ? tools
      : tools.filter((tool) => tool.category === selectedCategory)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 mb-4 font-display">
          工具列表
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl">
          探索我們提供的所有工具，每個工具都經過精心設計，幫助您提升工作效率
        </p>
      </div>

      {/* Category Filters */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/30'
                  : 'glass-effect text-gray-300 hover:text-neon-cyan hover:border-neon-cyan/50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool) => (
          <Link
            key={tool.id}
            to={tool.route}
            className="glass-effect p-6 rounded-xl card-hover group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                {tool.icon}
              </div>
              <span className="text-xs px-2 py-1 bg-dark-card text-gray-400 rounded">
                {categories.find((c) => c.id === tool.category)?.name || tool.category}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2 group-hover:text-neon-cyan transition-colors">
              {tool.name}
            </h3>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {tool.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-dark-card/50 text-gray-400 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            找不到工具
          </h3>
          <p className="text-gray-500">
            請嘗試選擇其他分類
          </p>
        </div>
      )}
    </div>
  )
}