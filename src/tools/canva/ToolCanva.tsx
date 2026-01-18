import { useState, useEffect } from 'react'
import { CanvaPrompt } from '@/types/canva'
import {
  getAllPrompts,
  getPromptsByCategory as fetchPromptsByCategory,
  createPrompt,
  updatePrompt,
  deletePrompt,
  incrementUsageCount,
  searchPrompts,
} from '@/lib/supabase/canvaPrompts'

const CATEGORIES = [
  { id: 'all', name: '全部', icon: '📂' },
  { id: 'education', name: '教育', icon: '📚' },
  { id: 'business', name: '商業', icon: '💼' },
  { id: 'social', name: '社群', icon: '📱' },
  { id: 'design', name: '設計', icon: '🎨' },
  { id: 'other', name: '其他', icon: '📋' },
]

export default function ToolCanva() {
  const [prompts, setPrompts] = useState<CanvaPrompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<CanvaPrompt | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // 載入提示詞列表
  useEffect(() => {
    loadPrompts()
  }, [selectedCategory, searchQuery])

  const loadPrompts = async () => {
    setIsLoading(true)
    try {
      let data: CanvaPrompt[] = []

      if (searchQuery) {
        data = await searchPrompts(searchQuery)
      } else if (selectedCategory === 'all') {
        data = await getAllPrompts()
      } else {
        data = await fetchPromptsByCategory(selectedCategory)
      }

      setPrompts(data)
    } catch (error) {
      console.error('Failed to load prompts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 複製提示詞到剪貼簿
  const handleCopyPrompt = async (prompt: CanvaPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      
      // 增加使用次數
      await incrementUsageCount(prompt.id)
      
      // 更新本地狀態
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === prompt.id ? { ...p, usage_count: (p.usage_count || 0) + 1 } : p
        )
      )

      // 顯示成功訊息（可以改用 toast 通知）
      alert('提示詞已複製到剪貼簿！')
    } catch (error) {
      console.error('Failed to copy:', error)
      alert('複製失敗，請重試')
    }
  }

  // 刪除提示詞
  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個提示詞嗎？')) return

    const success = await deletePrompt(id)
    if (success) {
      setPrompts((prev) => prev.filter((p) => p.id !== id))
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null)
      }
    } else {
      alert('刪除失敗，請重試')
    }
  }

  // 過濾後的提示詞列表
  const filteredPrompts = prompts.filter((prompt) => {
    if (selectedCategory !== 'all' && prompt.category !== selectedCategory) {
      return false
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* 標題與新增按鈕 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-100 mb-2 font-display">
            Canva 提示詞庫
          </h2>
          <p className="text-gray-400">
            管理與快速調用 Canva 設計提示詞
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all duration-300"
        >
          + 新增提示詞
        </button>
      </div>

      {/* 搜尋與分類篩選 */}
      <div className="glass-effect p-4 rounded-xl space-y-4">
        {/* 搜尋欄 */}
        <div>
          <input
            type="text"
            placeholder="搜尋提示詞..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-neon-cyan transition-colors"
          />
        </div>

        {/* 分類標籤 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id)
                setSearchQuery('')
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/30'
                  : 'glass-effect text-gray-300 hover:text-neon-cyan hover:border-neon-cyan/50'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* 提示詞列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">載入中...</div>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className="glass-effect p-12 rounded-xl text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {searchQuery ? '找不到符合的提示詞' : '還沒有提示詞'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? '請嘗試其他關鍵字' : '點擊上方按鈕新增第一個提示詞'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="glass-effect p-6 rounded-xl hover:border-neon-cyan/50 transition-all duration-300"
            >
              {/* 標題與操作 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-100 mb-1">
                    {prompt.title}
                  </h3>
                  {prompt.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {prompt.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedPrompt(prompt)
                      setShowEditModal(true)
                    }}
                    className="px-3 py-1 text-xs bg-dark-card text-gray-400 hover:text-neon-cyan rounded transition-colors"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="px-3 py-1 text-xs bg-dark-card text-red-400 hover:text-red-300 rounded transition-colors"
                  >
                    刪除
                  </button>
                </div>
              </div>

              {/* 標籤與分類 */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 text-xs bg-neon-blue/20 text-neon-cyan rounded">
                  {
                    CATEGORIES.find((c) => c.id === prompt.category)?.name ||
                    prompt.category
                  }
                </span>
                {prompt.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-dark-card text-gray-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 預覽內容 */}
              <div className="mb-4">
                <div className="p-3 bg-dark-card/50 rounded-lg border border-dark-border max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-300 line-clamp-4 whitespace-pre-wrap">
                    {prompt.content}
                  </p>
                </div>
              </div>

              {/* 使用次數與複製按鈕 */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  使用 {prompt.usage_count || 0} 次
                </span>
                <button
                  onClick={() => handleCopyPrompt(prompt)}
                  className="px-4 py-2 bg-neon-blue/20 text-neon-cyan rounded-lg hover:bg-neon-blue/30 transition-colors text-sm font-medium"
                >
                  📋 複製提示詞
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增提示詞模組 */}
      {showAddModal && (
        <PromptModal
          onClose={() => setShowAddModal(false)}
          onSave={async (data) => {
            const newPrompt = await createPrompt(data)
            if (newPrompt) {
              setPrompts((prev) => [newPrompt, ...prev])
              setShowAddModal(false)
            }
          }}
        />
      )}

      {/* 編輯提示詞模組 */}
      {showEditModal && selectedPrompt && (
        <PromptModal
          prompt={selectedPrompt}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPrompt(null)
          }}
          onSave={async (data) => {
            const updated = await updatePrompt(selectedPrompt.id, data)
            if (updated) {
              setPrompts((prev) =>
                prev.map((p) => (p.id === selectedPrompt.id ? updated : p))
              )
              setShowEditModal(false)
              setSelectedPrompt(null)
            }
          }}
        />
      )}
    </div>
  )
}

// 提示詞表單模組
interface PromptModalProps {
  prompt?: CanvaPrompt
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

function PromptModal({ prompt, onClose, onSave }: PromptModalProps) {
  const [formData, setFormData] = useState({
    title: prompt?.title || '',
    description: prompt?.description || '',
    category: prompt?.category || 'other',
    tags: prompt?.tags?.join(', ') || '',
    content: prompt?.content || '',
    example_result: prompt?.example_result || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      ...formData,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    }
    await onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-effect max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-100">
            {prompt ? '編輯提示詞' : '新增提示詞'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              標題 *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              描述
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                分類 *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors"
              >
                {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                標籤（用逗號分隔）
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="設計, 教育, 統計表"
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              提示詞內容 *
            </label>
            <textarea
              required
              rows={10}
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              範例結果（可選）
            </label>
            <textarea
              rows={3}
              value={formData.example_result}
              onChange={(e) =>
                setFormData({ ...formData, example_result: e.target.value })
              }
              className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-gray-100 focus:outline-none focus:border-neon-cyan transition-colors"
            />
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-dark-border text-gray-300 rounded-lg hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-neon-blue/50 transition-all duration-300"
            >
              {prompt ? '更新' : '建立'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}