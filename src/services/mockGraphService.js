// Mock service de grafos com funções utilitárias para operações de grafos

// Transforma um inteiro em letras:
// 1 = A | 2 = B ... 25 = Y | 26 = Z | 27 = AA | 28 = AB ...
const toLetter = (int) => {
    let elem = "";
    let intD = Math.floor(int / 26);
    let intR = int % 26;
    
    if (intR <= 0) {
        intR = 26;
        intD -= 1;
    }
  
    elem += String.fromCharCode(64 + intR);

    if (intD > 0) {
        elem = toLetter(intD) + elem;
    }
    
    return elem;
};

// Gera uma lista de nodes do tamanho inteiro do parametro:
// 1 = ['A'] | 2 = ['A', 'B'] | 3 = ['A', 'B', 'C'] ...
const genNodes = (int) => {
    let nodes = [];
    if (int <= 0) {
        return nodes;
    }

    for (let i = 0; i < int; i++) {
        nodes.push({ id: toLetter(i + 1) });
    }

    return nodes;
};

// Gera uma matriz com o tamanho do parametro, com o valor default do paramentro
//     | 0  0 |       | 0  0  0 |
// 2 = | 0  0 | ; 3 = | 0  0  0 | ; ...
//                    | 0  0  0 |
const genMatrix = (size, defaultValue = 0) => {
    let matrix = [];
    if (size <= 0) {
        return matrix;
    }
    for (let i = 0; i < size; i++) {
        matrix.push([]);
        for (let j = 0; j < size; j++) {
            matrix[i].push(defaultValue);
        }
    }
    return matrix;
};

// Adiciona Aresta/Adjacencias passando a matriz, a origem, o destino e o peso
// Se o inverso (destino -> origem) não tiver nenhuma ligação (destino = 0),
// ou no caso de ser uma atualização da origem (destino < 0),
// define o valor do mesmo como o oposto do passado pela origem.
// Se destino for positivo, não altera o valor do mesmo
//
//  M = | 0  0 |  e  'A' --2--> 'B'  , logo:  M = |  0  2 |  
//      | 0  0 |                                  | -2  0 |
//
// Depois define: 'A' --3--> 'B', logo: M = |  0  3 | , por fim 'B' --1--> 'A'  => M = | 0  3 |
//                                          | -3  0 |                                  | 1  0 |
//
const addEdge = (matrix, from, to, weight) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let fromI = chars.indexOf(from);
    let toI = chars.indexOf(to);
    
    matrix[fromI][toI] = weight;
    
    if (matrix[toI][fromI] <= 0) {
        matrix[toI][fromI] = weight * (-1);
    }
    
    return matrix;
};

// Passado a matriz ele a converte em um objeto de conexoes:
// {'A': [{ to: 'Y', weigth: Z }, ...], 'B': [{...}, ...], ...}
const extractConnections = (matrix) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let con = {};
  
    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] > 0) {
                if (con[chars[i]] === undefined) {
                    con[chars[i]] = [];
                }
                
                con[chars[i]].push({
                    to: chars[j],
                    weight: matrix[i][j]
                });
            }
        }
    }
    
    return con;
};

// Passado um objeto com os pesos de cada elemento e dado uma origem e um destino, é calculado o menor caminho
// pegando o destino e vendo o antecessor dele, se o antecessor não for a origem, chama a função novamente
// passando o antecessor do mesmo como destino, quando encontrar o sucessor da origem, adiciona a origem e
// seu sucessor em uma lista que representa o caminho, volta essa lista, se foi esse mesmo método que chamou,
// adiciona o elemento na lista, no fim você terá uma lista [origem ... destino], do caminho completo.
const buildPath = (item, orig, dest) => {
    if (item[dest].p === orig) {
        return [orig, dest];
    }
    let path = buildPath(item, orig, item[dest].p);
    path.push(dest);
    return path;
};

// Dado uma lista de nós, seus adjacentes com pesos, uma origem e um destino, calcula o caminho com menor custo possivel
// Seguindo o algoritmo de Dijkstra 
const dijkstra = (nodes, adjs, orig, dest) => {
    let pathWeight = {};
    
    nodes.forEach(node => {
        pathWeight[node.id] = { w: Infinity, p: null };
    });
    
    let unvisited = nodes.map(node => node.id);
    let now = orig;
    pathWeight[orig].w = 0;
  
    while (unvisited.length > 0) {
        let min = Infinity;
        
        // Obtem menor valor não visitado
        Object.keys(pathWeight).forEach(k => {
            if (unvisited.includes(k) && pathWeight[k].w < min) {
                min = pathWeight[k].w;
                now = k;
            }
        });
    
        // Calcula o valor de seus adjacentes
        if (adjs[now] !== undefined) {
            adjs[now].forEach(adj => {
                const OLD = pathWeight[adj.to].w;
                const NEW = pathWeight[now].w + adj.weight;
                if (NEW < OLD) {
                    pathWeight[adj.to].w = NEW;
                    pathWeight[adj.to].p = now;
                }
            });
        }

        unvisited.splice(unvisited.indexOf(now), 1);
    }
  
    let path = buildPath(pathWeight, orig, dest);
    
    return { "path": path, "weight": pathWeight[dest].w };
};

// Gera dados de um exemplo de grafo
// Retorna um objeto com nodes, edges e elements (para bibliotecas de visualização)
export const generateGraphData = (nodeCount) => {
    const nodes = genNodes(nodeCount);
    const edges = [];
    
    // Gera um número de arestas entre 1.5x o número de nós e o máximo possível (nós * (nós - 1))
    const edgeCount = Math.min(Math.floor(nodeCount * 1.5), nodeCount * (nodeCount - 1));
    const usedPairs = new Set();
  
    for (let i = 0; i < edgeCount && edges.length < edgeCount; i++) {
        const fromIndex = Math.floor(Math.random() * nodeCount);
        const toIndex = Math.floor(Math.random() * nodeCount);
      
        if (fromIndex !== toIndex) {
            const from = nodes[fromIndex].id;
            const to = nodes[toIndex].id;
            const pairKey = `${from}-${to}`;
          
            if (!usedPairs.has(pairKey)) {
                usedPairs.add(pairKey);
                edges.push({
                    id: pairKey,
                    source: from,
                    target: to,
                    weight: Math.floor(Math.random() * 10) + 1
                });
            }
        }
    }
  
    // Garante que há um caminho entre todos os nós, conectando-os em sequência se necessário
    for (let i = 1; i < nodes.length; i++) {
        const from = nodes[i - 1].id;
        const to = nodes[i].id;
        const pairKey = `${from}-${to}`;
      
        if (!edges.some(edge => edge.id === pairKey)) {
            edges.push({
                id: pairKey,
                source: from,
                target: to,
                weight: Math.floor(Math.random() * 5) + 1
            });
        }
    }
  
    // Combina nós e arestas em um formato utilizável por bibliotecas de visualização de grafos
    const elements = [
        ...nodes.map(node => ({ data: node, group: 'nodes' })),
        ...edges.map(edge => ({ data: edge, group: 'edges' }))
    ];
  
    return { nodes, edges, elements };
};

// Executa o algoritmo de Dijkstra em um grafo fornecido, retornando o caminho e a distância
export const dijkstraAlgorithm = (graphData, start, end) => {

    // Cria uma lista de adjacências a partir dos dados do grafo
    const adjacencyList = {};
    
    graphData.edges.forEach(edge => {
        if (!adjacencyList[edge.source]) {
            adjacencyList[edge.source] = [];
        }
        adjacencyList[edge.source].push({
            to: edge.target,
            weight: edge.weight
        });
    });
  
    const result = dijkstra(graphData.nodes, adjacencyList, start, end);
    
    return {
        path: result.path,
        distance: result.weight
    };
};

// Exporta as funções utilitárias
export { toLetter, genNodes, genMatrix, addEdge, extractConnections, dijkstra };