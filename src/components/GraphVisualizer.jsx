import React, { useState, useRef, useEffect, use } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

// Itens do projeto
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { generateGraphData, dijkstraAlgorithm, toLetter } from '../services/mockGraphService';
import { useToast } from '../hooks/use-toast';

import cat from '/gatito.gif'

import { 
  Plus,
  Download,
  RotateCcw, 
  Route,
  Table as TableIcon,
  Save,
  X,
  Image,
  Music4,
  Play,
  Pause
} from 'lucide-react';

cytoscape.use(dagre);

// Componente da Tabela de Pesos
const WeightTable = ({ graphData }) => {
    const generateWeightMatrix = () => {
        const matrix = {};
        const nodeIds = graphData.nodes.map(node => node.id).sort();
        
        // {A: {A: 0, B: ∞, C: ∞},
        //  B: {A: ∞, B: 0, C: ∞},
        //  C: {A: ∞, B: ∞, C: 0}}

        // Initialize matrix
        nodeIds.forEach(from => {
            matrix[from] = {};
            nodeIds.forEach(to => {
                matrix[from][to] = from === to ? 0 : '∞';
            });
        });
      
        // Create a map to track bidirectional edges
        const edgeMap = new Map();
      
        // First pass: collect all edges
        graphData.edges.forEach(edge => {
            const forwardKey = `${edge.source}-${edge.target}`;
            const reverseKey = `${edge.target}-${edge.source}`;
            
            edgeMap.set(forwardKey, edge.weight);
        });
      
        // Second pass: fill matrix with proper bidirectional logic
        graphData.edges.forEach(edge => {
            const forwardKey = `${edge.source}-${edge.target}`;
            const reverseKey = `${edge.target}-${edge.source}`;
            
            // Set the forward direction
            matrix[edge.source][edge.target] = edge.weight;
            
            // Check if there's a reverse edge
            if (edgeMap.has(reverseKey)) {
                // There's a bidirectional connection, use actual reverse weight
                matrix[edge.target][edge.source] = edgeMap.get(reverseKey);
            } else {
                // No reverse edge, use negative value to indicate one-way
                if (matrix[edge.target][edge.source] === '∞') {
                    matrix[edge.target][edge.source] = -edge.weight;
                }
            }
        });
      
        return { matrix, nodeIds };
    };

    const { matrix, nodeIds } = generateWeightMatrix();

    return (
        <div className="space-y-4">
            <div className="text-sm text-slate-600">
                Essa tabela mostra o peso das arestas entre os nós. 
                {/* <span className="font-semibold"> 0</span> = same node, 
                <span className="font-semibold"> ∞</span> = no direct connection,
                <span className="font-semibold text-red-600"> negative values</span> = opposite direction of one-way edge. */}
            </div>
            <Table className="bg-white border border-slate-200 shadow-sm">
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                        <TableHead className="w-12 text-center font-bold bg-slate-50 border-r border-slate-200">De</TableHead>
                        {nodeIds.map(nodeId => (
                            <TableHead key={nodeId} className="text-center font-bold min-w-16 bg-slate-50 border-r border-slate-200">
                                {nodeId}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {nodeIds.map(fromNode => (
                        <TableRow key={fromNode}>
                            <TableCell className="text-center font-bold bg-slate-50 border-r border-slate-200">
                                {fromNode}
                            </TableCell>
                            {nodeIds.map(toNode => (
                                <TableCell key={toNode} className="text-center border-r border-slate-200">
                                    <span className={`
                                        px-2 py-1 rounded text-sm font-mono
                                        ${matrix[fromNode][toNode] === 0 
                                            ? 'bg-gray-100 text-gray-600' 
                                            : matrix[fromNode][toNode] === '∞' 
                                                ? 'bg-red-50 text-red-500' 
                                                : typeof matrix[fromNode][toNode] === 'number' && matrix[fromNode][toNode] < 0
                                                    ? 'bg-orange-50 text-orange-700 font-semibold'
                                                    : 'bg-blue-50 text-blue-700 font-semibold'
                                        }
                                    `}>
                                        {matrix[fromNode][toNode]}
                                    </span>
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-xs font-semibold text-slate-700 mb-2">Legenda:</div>
                <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-gray-100 rounded"></span>
                        <span>Mesmo nó (0)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-blue-50 rounded"></span>
                        <span>Conexão Direta</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-orange-50 rounded"></span>
                        <span>Direção Oposta (-valor)</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="w-4 h-4 bg-red-50 rounded"></span>
                        <span>Sem conexão (∞)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GraphVisualizer = () => {
    const cyRef = useRef(null);
    const containerRef = useRef(null);
    const { toast } = useToast(); 

    const [cy, setCy] = useState(null);
    const [showWeightTable, setShowWeightTable] = useState(false);
    const [showAutoGenerator, setShowAutoGenerator] = useState(false);

    const [selectedNodes, setSelectedNodes] = useState({ from: '', to: '' });
    const [selectedEdge, setSelectedEdge] = useState(null);

    const [edgeWeight, setEdgeWeight] = useState(1);
    
    const [shortestPath, setShortestPath] = useState([]);

    const [graphData, setGraphData] = useState(generateGraphData(4)); // = {nodes: [{id: A}, {id: B}, {id: C}], edges: [{source: A, target: B, weight: 1}], elements: {}}

    const [nodeCount, setNodeCount] = useState(4);
    const [editingWeight, setEditingWeight] = useState('');
    const [pathDistance, setPathDistance] = useState(0);

    // Inicializa o Cytoscape
    useEffect(() => {
        if (cyRef.current && containerRef.current) {
            const cytoscapeInstance = cytoscape({
                container: cyRef.current,
                elements: graphData.elements,
                style: [
                    {
                            selector: 'node',
                            style: {
                                'background-color': '#3b82f6',
                                'color': '#ffffff',
                                'label': 'data(id)',
                                'text-valign': 'center',
                                'text-halign': 'center',
                                'font-size': '14px',
                                'font-weight': 'bold',
                                'width': '40px',
                                'height': '40px',
                                'border-width': '2px',
                                'border-color': '#1e40af',
                                'transition-property': 'background-color, border-color, width, height',
                                'transition-duration': '0.3s'
                            }
                    },
                    {
                            selector: 'node:selected',
                            style: {
                                'background-color': '#dc2626',
                                'border-color': '#b91c1c',
                                'width': '45px',
                                'height': '45px'
                            }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'curve-style': 'bezier',
                            'target-arrow-shape': 'triangle',
                            'target-arrow-color': '#64748b',
                            'line-color': '#64748b',
                            'width': '2px',
                            'label': 'data(weight)',
                            'font-size': '12px',
                            'text-rotation': 'autorotate',
                            'text-margin-y': -10,
                            'color': '#1e293b',
                            'text-background-color': '#ffffff',
                            'text-background-opacity': 0.8,
                            'text-background-shape': 'round-rectangle',
                            'text-background-padding': '2px',
                            'transition-property': 'line-color, target-arrow-color, width',
                            'transition-duration': '0.3s'
                        }
                    },
                    {
                        selector: 'edge:selected',
                            style: {
                                'line-color': '#f59e0b',
                                'target-arrow-color': '#f59e0b',
                                'width': '4px',
                                'text-background-color': '#fef3c7',
                                'color': '#92400e'
                            }
                    },
                    {
                        selector: '.path-highlight',
                        style: {
                            'line-color': '#10b981',
                            'target-arrow-color': '#10b981',
                            'width': '4px',
                            'z-index': 999
                        }
                    },
                    {
                        selector: '.path-node',
                        style: {
                            'background-color': '#10b981',
                            'border-color': '#059669',
                            'width': '50px',
                            'height': '50px'
                        }
                    }
                ],
                layout: {
                    name: 'dagre',
                    directed: true,
                    spacingFactor: 1.5,
                    nodeDimensionsIncludeLabels: true
                },
                userZoomingEnabled: true,
                userPanningEnabled: true,
                boxSelectionEnabled: false
            });

            // Event listeners
            cytoscapeInstance.on('tap', 'node', (event) => {
                const nodeId = event.target.id();
                setSelectedEdge(null); // Limpa a seleção de arestas ao selecionar nós
                setSelectedNodes(prev => {
                    if (!prev.from) {
                        return { ...prev, from: nodeId };
                    } else if (!prev.to && nodeId !== prev.from) {
                        return { ...prev, to: nodeId };
                    } else {
                        return { from: nodeId, to: '' };
                    }
                });
            });

            cytoscapeInstance.on('tap', 'edge', (event) => {
                const edgeId = event.target.id();
                const edgeData = event.target.data();
                setSelectedEdge(edgeData);
                setEditingWeight(edgeData.weight.toString());
                setSelectedNodes({ from: '', to: '' }); // Limpa a seleção dos nós quando selecionar uma aresta
            });

            cytoscapeInstance.on('cxttap', 'node', (event) => {
                const nodeId = event.target.id();
                if (graphData.nodes.length > 2) {
                    removeNode(nodeId);
                } else {
                    toast({
                        title: "O nó não pode ser removido",
                        description: "O Grafo deve ter no mínimo 2 nós",
                        variant: "destructive"
                    });
                }
            });

            cytoscapeInstance.on('cxttap', 'edge', (event) => {
                const edgeId = event.target.id();
                removeEdge(edgeId);
            });

            setCy(cytoscapeInstance);
        
            // Faz uma instancia global do cytoscape para testes
            window.cy = cytoscapeInstance;

            return () => {
                if (cytoscapeInstance) {
                    cytoscapeInstance.destroy();
                }
                window.cy = null;
            };
        }
    }, [graphData]);

    // Função para construir o caminho a partir do objeto de pesos
    const generateGraph = () => {
        const newData = generateGraphData(nodeCount);
        setGraphData(newData);

        // Zera campos
        setSelectedNodes({ from: '', to: '' });
        setSelectedEdge(null);
        setShortestPath([]);
        setPathDistance(0);

        // Informa ao usuário que o novo grafo foi gerado
        toast({
            title: "Grafo Criado",
            description: `Um novo grafo foi gerado com ${nodeCount} nós criados`,
        });
    };

    // Adiciona um novo nó ao grafo
    const addNode = () => {
        // const newNodeId = String.fromCharCode(65 + graphData.nodes.length);
        // Gera o novo nó com o char correspondente
        const newNodeId = toLetter(graphData.nodes.length + 1);

        // Atualiza os dados do grafo
        const newData = {
            // Pega os dados antigos
            ...graphData,

            // Adiciona os nós antigos e e os novos
            nodes: [...graphData.nodes, { id: newNodeId }],

            // Filtra os antigos elementos do tipo aresta,
            // em seguida monta os nós no formato correto e adiciona o novo nó
            elements: [
                ...graphData.elements.filter(el => el.group === 'edges'),
                ...graphData.nodes.map(node => ({ data: node, group: 'nodes' })),
                { data: { id: newNodeId }, group: 'nodes' }
            ]
        };
        setGraphData(newData);
        toast({
            title: "Nó Adicionado",
            description: `Nó ${newNodeId} foi adicionado ao grafo`,
        });
    };

    // Remove o nó e todas as arestas conectadas a ele
    const removeNode = (nodeId) => {
        // Seleciona todos os nós 
        const newNodes = graphData.nodes.filter(node => node.id !== nodeId);

        // Seleciona todas as arestas 
        const newEdges = graphData.edges.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
        );

        // Seta os dados do grafo conforme os novos 
        const newData = {
            nodes: newNodes,
            edges: newEdges,
            elements: [
                ...newNodes.map(node => ({ data: node, group: 'nodes' })),
                ...newEdges.map(edge => ({ data: edge, group: 'edges' }))
            ]
        };
        setGraphData(newData);
        
        // Seta como nenhum nó selecionado
        if (selectedNodes.from === nodeId || selectedNodes.to === nodeId) {
            setSelectedNodes({ from: '', to: '' });
        }
        
        // Informa ao usuário que o nó foi removido
        toast({
            title: "Nó Removido",
            description: `Nó ${nodeId} e suas arestas foram removidos do grafo`,
        });
    };

    // Adiciona uma nova aresta entre os nós selecionados
    const addEdge = () => {
        // Verifica se é válido os nós e se o peso é maior que 0
        if (!selectedNodes.from || !selectedNodes.to || edgeWeight <= 0) {
            toast({
                title: "Aresta inválida",
                description: "Por favor selecione nós válidos e insira um peso positivo",
                variant: "destructive"
            });
            return;
        }

        // Verifica se a aresta já existe
        const edgeExists = graphData.edges.some(edge => 
            edge.source === selectedNodes.from && edge.target === selectedNodes.to
        );

        // Se existe a aresta não adiciona e informa ao usuário
        if (edgeExists) {
            toast({
                title: "Aresta já existe",
                description: "A aresta entre os nós selecionados já existe",
                variant: "destructive"
            });
            return;
        }

        // Monta a nova aresta
        const newEdge = {
            id: `${selectedNodes.from}-${selectedNodes.to}`,
            source: selectedNodes.from,
            target: selectedNodes.to,
            weight: edgeWeight
        };

        // Adiciona a nova aresta nos dados do grafo
        const newData = {
            ...graphData,
            edges: [...graphData.edges, newEdge],
            elements: [
                ...graphData.elements.filter(el => el.group === 'nodes'),
                ...graphData.edges.map(edge => ({ data: edge, group: 'edges' })),
                { data: newEdge, group: 'edges' }
            ]
        };

        // Seta os dados define o peso como 1 e 
        setGraphData(newData);
        setSelectedNodes({ from: '', to: '' });
        setEdgeWeight(1);
        
        toast({
            title: "Aresta Adicionada",
            description: `Aresta de ${selectedNodes.from} para ${selectedNodes.to} com peso ${edgeWeight}`,
        });
    };

    // Remove a aresta selecionada
    const removeEdge = (edgeId) => {
        // Todas as arestas sem a que está sendo removida
        const newEdges = graphData.edges.filter(edge => edge.id !== edgeId);

        // Atualiza os dados
        const newData = {
            ...graphData,
            edges: newEdges,
            elements: [
                ...graphData.elements.filter(el => el.group === 'nodes'),
                ...newEdges.map(edge => ({ data: edge, group: 'edges' }))
            ]
        };

        // Set os novos dados do grafo
        setGraphData(newData);
        setSelectedEdge(null);
        
        // Informa ao usuário que a aresta foi removida
        toast({
            title: "Aresta Removida",
            description: `A aresta ${edgeId} foi removida do grafo`,
        });
    };

    // Atualiza o peso da aresta selecionada
    const updateEdgeWeight = () => {
        if (!selectedEdge || !editingWeight || parseFloat(editingWeight) <= 0) {
            toast({
                title: "Peso inválido",
                description: "Por favor insira um peso positivo",
                variant: "destructive"
            });
            return;
        }

        const newWeight = parseFloat(editingWeight);
        const updatedEdges = graphData.edges.map(edge => 
            edge.id === selectedEdge.id 
                ? { ...edge, weight: newWeight }
                : edge
        );

        const newData = {
            ...graphData,
            edges: updatedEdges,
            elements: [
                ...graphData.elements.filter(el => el.group === 'nodes'),
                ...updatedEdges.map(edge => ({ data: edge, group: 'edges' }))
            ]
        };

        setGraphData(newData);
        setSelectedEdge(null);
        setEditingWeight('');
        
        toast({
            title: "Peso Atualizado",
            description: `O peso da aresta ${selectedEdge.id} foi mudado para ${newWeight}`,
        });
    };

    // Implementa o algoritmo de Dijkstra para encontrar o caminho mais curto
    const calculateShortestPath = () => {
        if (!selectedNodes.from || !selectedNodes.to) {
            toast({
                title: "Selecione os nós",
                description: "Por favor selecione os nós de origem e destino para calcular o caminho",
                variant: "destructive"
            });
            return;
        }

        const result = dijkstraAlgorithm(graphData, selectedNodes.from, selectedNodes.to);
        
        if (result.distance === Infinity) {
            toast({
                title: "Não foi possível encontrar um caminho",
                description: "Não existe um caminho entre os nós selecionados",
                variant: "destructive"
            });
            return;
        }

        setShortestPath(result.path);
        setPathDistance(result.distance);
        
        // Destaca o caminho no grafo
        if (cy) {
            cy.elements().removeClass('path-highlight path-node');
            
            // Destaca os nós do caminho
            result.path.forEach(nodeId => {
                cy.getElementById(nodeId).addClass('path-node');
            });
            
            // Destaca as arestas do caminho
            for (let i = 0; i < result.path.length - 1; i++) {
                const edgeId = `${result.path[i]}-${result.path[i + 1]}`;
                cy.getElementById(edgeId).addClass('path-highlight');
            }
        }

        toast({
            title: "Menor caminho calculado",
            description: `Caminho: ${result.path.join(' → ')} (Distância: ${result.distance})`,
        });
    };

    // Limpa o caminho destacado
    const clearPath = () => {
        setShortestPath([]);
        setPathDistance(0);
        if (cy) {
            cy.elements().removeClass('path-highlight path-node');
        }
    };

    // Exporta o grafo como PNG
    // Tenta usar o método embutido do Cytoscape, se falhar, usa html2canvas como fallback
    const exportGraph = async () => {
        if (cyRef.current) {
            try {
                // Usa o método embutido do Cytoscape para exportar como PNG
                const pngBlob = cy.png({
                    output: 'blob',
                    bg: '#ffffff',
                    full: true,
                    scale: 2
                });
                
                // Cria um link temporário para download
                const url = URL.createObjectURL(pngBlob);
                const link = document.createElement('a');
                link.download = 'graph-visualization.png';
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                toast({
                    title: "Exportado com sucesso",
                    description: " O Grafo foi exportado como PNG",
                });
            } catch (error) {
                console.error('Export error:', error);
                // Se houver um erro, tenta usar html2canvas como fallback
                try {
                    if (containerRef.current) {
                        const canvas = await html2canvas(containerRef.current, {
                            backgroundColor: '#ffffff',
                            scale: 2,
                            useCORS: true,
                            allowTaint: true
                        });
                        
                        const link = document.createElement('a');
                        link.download = 'graph-visualization.png';
                        link.href = canvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        toast({
                            title: "Exportado com sucesso",
                            description: "O Grafo foi exportado como PNG (fallback)",
                        });
                    }
                } catch (fallbackError) {
                    console.error('Fallback export error:', fallbackError);
                    toast({
                        title: "Exportação falhou",
                        description: "Não foi possível exportar o grafo. Por favor tente novamente.",
                        variant: "destructive"
                    });
                }
            }
        }
    };

    //EASTER EGG
    const [showCat, setShowCat] = useState(false)
    const catAudioRef = useRef(null); 
    const catAudio = '/easteregg-audio.mp3';
    const musicRef = useRef(null);
    const musicAudio = '/music.mp3';
    const [isPlaying, setIsPlaying] = useState(false);

    function easterEgg() {
        if (catAudioRef.current) {
            catAudioRef.current.play();
        }

        setShowCat(true);
    }

    const togglePlayPause = () => {
        if (musicRef.current) {
            if (isPlaying) {
                musicRef.current.pause();
                setIsPlaying(false);
            } else {
                // Tenta tocar, e atualiza o estado se for bem-sucedido
                musicRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                        // Se falhar (ex: bloqueio do navegador), apenas atualiza o estado para false
                        setIsPlaying(false);
                    });
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <div className='flex justify-between items-center'>
                        <h1 className="text-4xl font-bold text-slate-800 mb-2 cursor-pointer select-none" onClick={() => {easterEgg()}} title='Click-me'>Visualizador de Caminho do Grafo</h1>
                        <div className='flex items-center gap-3'>
                            <audio ref={musicRef} src={musicAudio}></audio>
                            <Button onClick={togglePlayPause} variant="ghost" title={isPlaying ? 'Pausar Música' : 'Tocar Música'}>
                                {isPlaying ? <Pause/> : <Play/>}
                            </Button>
                            <a target='_blank' href='https://www.youtube.com/watch?v=bnatNV3qlbQ'><Music4/></a>
                        </div>
                    </div>
                    <p className="text-slate-600">Visualização interativa de grafo com algoritmo de menor caminho de Dijkstra</p>
                    <Dialog open={showCat} onOpenChange={() => setShowCat(false)}>
                        <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                            <DialogHeader>
                                <DialogTitle>Spoiler</DialogTitle>
                            </DialogHeader>
                            <img src={cat} alt="gatito" />
                            <p>Quem manda nessa porra sou aqui eu!</p>
                        </DialogContent>
                    </Dialog>
                    <audio ref={catAudioRef} src={catAudio}></audio>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Painel de Controle */}
                    <div className="lg:col-span-1">
                        <Card className="p-6 backdrop-blur-sm bg-white/70 border-0 shadow-lg">
                            <div className="space-y-6">
                                {/* Mode de criação de grafo */}
                                <div>
                                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Criação de Grafo</Label>
                                    <div className="space-y-2">
                                        <div>
                                            <Button onClick={() => setShowAutoGenerator(true)} variant="outline" size="sm" className="text-xs w-full">
                                                <RotateCcw className="w-3 h-3 mr-1" /> Auto
                                            </Button>
                                        </div>
                    
                                        {showAutoGenerator && (
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <div>
                                                    <Label htmlFor="nodeCount" className="text-xs text-slate-600">Números de Nós</Label>
                                                    <Input
                                                        id="nodeCount"
                                                        type="number"
                                                        min="2"
                                                        max="26"
                                                        value={nodeCount}
                                                        onChange={(e) => setNodeCount(parseInt(e.target.value) || 2)}
                                                        className="mt-1 mb-2"
                                                    />
                                                </div>
                                                <div className="flex space-x-2">
                                                    <Button onClick={generateGraph} size="sm" className="flex-1">
                                                        Gerar
                                                    </Button>
                                                    <Button onClick={() => setShowAutoGenerator(false)} variant="outline" size="sm">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Operações de Nós */}
                                <div>
                                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Operações de Nós</Label>
                                    <div className="space-y-2">
                                        <Button onClick={addNode} variant="outline" className="w-full hover:bg-stone-300" size="sm">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Nó
                                        </Button>
                                        <p className="text-xs text-slate-500">Clique com botão direito nos nós para remove-los</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Operações de Arestas */}
                                <div>
                                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Operações de Arestas</Label>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-xs text-slate-600">De</Label>
                                                <Input
                                                    placeholder="A"
                                                    value={selectedNodes.from}
                                                    readOnly
                                                    className="mt-1 text-center"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-slate-600">Para</Label>
                                                <Input
                                                    placeholder="B"
                                                    value={selectedNodes.to}
                                                    readOnly
                                                    className="mt-1 text-center"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="weight" className="text-xs text-slate-600">Peso</Label>
                                            <Input
                                                id="weight"
                                                type="number"
                                                min="1"
                                                value={edgeWeight}
                                                onChange={(e) => setEdgeWeight(parseInt(e.target.value) || 1)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <Button onClick={addEdge} variant="outline" className="w-full" size="sm">
                                            <Plus className="w-4 h-4 mr-2" /> Adicionar Aresta
                                        </Button>
                                        <p className="text-xs text-slate-500">Clique nos nós para seleciona-los</p>
                                        {!selectedEdge && (
                                            <p className="text-xs text-slate-500 mt-1">Clique nas arestas para editar os pesos delas</p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* Editor de Aresta */}
                                {selectedEdge && (
                                    <div>
                                        <Label className="text-sm font-semibold text-slate-700 mb-3 block">Editar peso da aresta</Label>
                                        <div className="space-y-3">
                                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                                <div className="text-xs font-semibold text-orange-700 mb-1">Aresta selecionada:</div>
                                                <div className="text-sm font-mono text-orange-800 mb-2">
                                                    {selectedEdge.source} → {selectedEdge.target}
                                                </div>
                                                <div className="text-xs text-orange-600">Peso atual: {selectedEdge.weight}</div>
                                            </div>
                                            <div>
                                                <Label htmlFor="editWeight" className="text-xs text-slate-600">Novo peso</Label>
                                                <Input
                                                    id="editWeight"
                                                    type="number"
                                                    min="0.1"
                                                    step="0.1"
                                                    value={editingWeight}
                                                    onChange={(e) => setEditingWeight(e.target.value)}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button onClick={updateEdgeWeight} size="sm" className="flex-1">
                                                    <Save className="w-4 h-4 mr-1" /> Salvar
                                                </Button>
                                                <Button 
                                                    onClick={() => {
                                                        setSelectedEdge(null);
                                                        setEditingWeight('');
                                                    }} 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="flex-1"
                                                >
                                                    <X className="w-4 h-4 mr-1" /> Cancelar
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-500">Clique com botão direito nas aresstas para remove-las</p>
                                        </div>
                                        <Separator className="my-4" />
                                    </div>
                                )}

                                <Separator />

                                {/* Encontrador de Caminhos */}
                                <div>
                                    <Label className="text-sm font-semibold text-slate-700 mb-3 block">Encontrador de caminhos</Label>
                                    <div className="space-y-3">
                                        <Button onClick={calculateShortestPath} variant="outline" className="w-full" size="sm">
                                            <Route className="w-4 h-4 mr-2" /> Encontrar menor caminho
                                        </Button>
                                        {shortestPath.length > 0 && (
                                            <div>
                                                <Button onClick={clearPath} variant="outline" size="sm" className="w-full mb-2">
                                                    Limpar caminho
                                                </Button>
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                    <div className="text-xs font-semibold text-green-700 mb-1">Menor caminho:</div>
                                                    <div className="text-sm font-mono text-green-800 mb-2">
                                                        {shortestPath.join(' → ')}
                                                    </div>
                                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                        Distancia: {pathDistance}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabela de pesos */}
                                <div>
                                    <Dialog open={showWeightTable} onOpenChange={setShowWeightTable}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full" size="sm">
                                                <TableIcon className="w-4 h-4 mr-2" /> Ver matriz de pesos
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                                            <DialogHeader>
                                                <DialogTitle>Matriz da relação de pesos</DialogTitle>
                                            </DialogHeader>
                                            <div className="max-h-96 overflow-auto">
                                                <WeightTable graphData={graphData} />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {/* Exportar */}
                                <div>
                                    <Button onClick={exportGraph} variant="outline" className="w-full" size="sm">
                                        <Download className="w-4 h-4 mr-2" /> Exportar como PNG
                                    </Button>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-400 text-center flex flex-col">
                                        <span> Desenvolvido por:</span>
                                        <span>
                                            <a className="underline" href="#">Cássius Fernando</a> e <a className="underline" href="#">Eduardo Reis</a>
                                        </span>
                                        <span>2025</span>
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Visualização do grafo */}
                    <div className="lg:col-span-3">
                        <Card className="h-[600px] backdrop-blur-sm bg-white/70 border-0 shadow-lg overflow-hidden">
                            <div ref={containerRef} className="w-full h-full relative">
                                <div
                                    ref={cyRef}
                                    className="w-full h-full"
                                    style={{ minHeight: '600px' }}
                                />
                                <div className="absolute bottom-4 right-4 flex space-x-2">
                                    <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                                        Nós: {graphData.nodes.length}
                                    </Badge>
                                        <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm">
                                        Arestas: {graphData.edges.length}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>

        // <>
        //     {WeightTable({ graphData: {
        //         nodes: [{id: 'A'}, {id: 'B'}, {id: 'C'}, {id: 'D'}],
        //         edges: [{source: 'A', target: 'B', weight: 3},
        //             {source: 'B', target: 'A', weight: 2},
        //             {source: 'A', target: 'C', weight: 5},
        //             {source: 'C', target: 'D', weight: 4}]
        //     }})}
        // </>
    )
}

export default GraphVisualizer;