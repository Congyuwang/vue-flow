import microDiff from 'microdiff'
import { setActivePinia, createPinia, defineStore, StoreDefinition, acceptHMRUpdate } from 'pinia'
import { FlowState, FlowActions, Elements, FlowGetters, GraphNode, GraphEdge, Edge } from '~/types'
import {
  getConnectedEdges,
  getNodesInside,
  getRectOfNodes,
  parseElements,
  defaultNodeTypes,
  defaultEdgeTypes,
  isGraphNode,
  getSourceTargetNodes,
  isEdge,
} from '~/utils'

const pinia = createPinia()

export default (id: string, preloadedState: FlowState) => {
  setActivePinia(pinia)

  const store: StoreDefinition<string, FlowState, FlowGetters, FlowActions> = defineStore({
    id: id ?? 'vue-flow',
    state: () => ({
      ...preloadedState,
    }),
    getters: {
      getEdgeTypes() {
        const edgeTypes: Record<string, any> = {
          ...defaultEdgeTypes,
        }
        this.edgeTypes?.forEach((n) => (edgeTypes[n] = n))
        return edgeTypes
      },
      getNodeTypes() {
        const nodeTypes: Record<string, any> = {
          ...defaultNodeTypes,
        }
        this.nodeTypes?.forEach((n) => (nodeTypes[n] = n))
        return nodeTypes
      },
      getNodes(): GraphNode[] {
        if (this.isReady) {
          const nodes = this.elements.filter((n) => isGraphNode(n) && !n.isHidden) as GraphNode[]
          return this.onlyRenderVisibleElements
            ? nodes &&
                getNodesInside(
                  nodes,
                  {
                    x: 0,
                    y: 0,
                    width: this.dimensions.width,
                    height: this.dimensions.height,
                  },
                  this.transform,
                  true,
                )
            : nodes ?? []
        }
        return []
      },
      getEdges(): GraphEdge[] {
        const edges = this.elements.filter((e) => isEdge(e) && !e.isHidden) as Edge[]
        if (this.isReady) {
          return (
            edges
              .map((edge) => {
                const { sourceNode, targetNode } = getSourceTargetNodes(edge, this.getNodes)
                if (!sourceNode) console.warn(`couldn't create edge for source id: ${edge.source}; edge id: ${edge.id}`)
                if (!targetNode) console.warn(`couldn't create edge for target id: ${edge.target}; edge id: ${edge.id}`)

                return {
                  ...edge,
                  sourceNode,
                  targetNode,
                }
              })
              .filter(({ sourceNode, targetNode }) => !!(sourceNode && targetNode)) ?? []
          )
        }
        return []
      },
      getSelectedNodes(): GraphNode[] {
        return this.selectedElements?.filter(isGraphNode) ?? []
      },
    },
    actions: {
      setElements(elements) {
        const { nodes, edges } = parseElements(elements, this.getNodes, this.getEdges, this.nodeExtent)
        this.elements = [...nodes, ...edges]
      },
      setUserSelection(mousePos) {
        this.selectionActive = true
        this.userSelectionRect = {
          width: 0,
          height: 0,
          startX: mousePos.x,
          startY: mousePos.y,
          x: mousePos.x,
          y: mousePos.y,
          draw: true,
        }
      },
      updateUserSelection(mousePos) {
        const startX = this.userSelectionRect.startX
        const startY = this.userSelectionRect.startY

        const nextUserSelectRect: FlowState['userSelectionRect'] = {
          ...this.userSelectionRect,
          x: mousePos.x < startX ? mousePos.x : this.userSelectionRect.x,
          y: mousePos.y < startY ? mousePos.y : this.userSelectionRect.y,
          width: Math.abs(mousePos.x - startX),
          height: Math.abs(mousePos.y - startY),
        }
        const selectedNodes = getNodesInside(this.getNodes, this.userSelectionRect, this.transform)
        const selectedEdges = getConnectedEdges(selectedNodes, this.getEdges)

        const nextSelectedElements = [...selectedNodes, ...selectedEdges]
        this.userSelectionRect = nextUserSelectRect
        this.selectedElements = nextSelectedElements
      },
      unsetUserSelection() {
        this.selectionActive = false
        this.userSelectionRect.draw = false

        if (!this.getSelectedNodes || this.getSelectedNodes.length === 0) {
          this.selectedElements = undefined
          this.nodesSelectionActive = false
        } else {
          this.selectedNodesBbox = getRectOfNodes(this.getSelectedNodes)
          this.nodesSelectionActive = true
        }
      },
      addSelectedElements(elements) {
        const selectedElementsArr = Array.isArray(elements) ? elements : [elements]
        const selectedElementsUpdated = microDiff(selectedElementsArr, this.selectedElements ?? []).length
        this.selectedElements = selectedElementsUpdated ? selectedElementsArr : this.selectedElements
      },
      initD3Zoom({ d3ZoomHandler, d3Zoom, d3Selection }) {
        this.d3Zoom = d3Zoom
        this.d3Selection = d3Selection
        this.d3ZoomHandler = d3ZoomHandler
      },
      setMinZoom(minZoom) {
        this.d3Zoom?.scaleExtent([minZoom, this.maxZoom])
        this.minZoom = minZoom
      },
      setMaxZoom(maxZoom) {
        this.d3Zoom?.scaleExtent([this.minZoom, maxZoom])
        this.maxZoom = maxZoom
      },
      setTranslateExtent(translateExtent) {
        this.d3Zoom?.translateExtent(translateExtent)
        this.translateExtent = translateExtent
      },
      setNodeExtent(nodeExtent) {
        this.nodeExtent = nodeExtent
      },
      resetSelectedElements() {
        this.selectedElements = undefined
      },
      unsetNodesSelection() {
        this.nodesSelectionActive = false
      },
      updateSize(size) {
        this.dimensions = size
      },
      setConnectionNodeId({ connectionHandleId, connectionHandleType, connectionNodeId }) {
        this.connectionNodeId = connectionNodeId
        this.connectionHandleId = connectionHandleId
        this.connectionHandleType = connectionHandleType
      },
      setInteractive(isInteractive) {
        this.nodesDraggable = isInteractive
        this.nodesConnectable = isInteractive
        this.elementsSelectable = isInteractive
      },
      addElements(elements: Elements) {
        const { nodes, edges } = parseElements(elements, this.getNodes, this.getEdges, this.nodeExtent)
        this.elements = [...this.elements, ...nodes, ...edges]
      },
    },
  })

  if (import.meta.hot) {
    import.meta.hot.accept(acceptHMRUpdate(store, import.meta.hot))
  }

  return store
}
