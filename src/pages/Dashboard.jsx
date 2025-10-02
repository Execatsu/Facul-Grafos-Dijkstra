import React, { useState } from 'react'
import { Button } from 'primereact/button';

export default function Dashboard() {
    const [numElem, setNumElem] = useState(0);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Transforma um inteiro em um char element:
    // 1 = A | 2 = B ... 25 = Y | 26 = Z | 27 = AA | 28 = AB ...
    function toLetter(int) {
        let elem = "";

        let intD = Math.floor(int / chars.length);
        let intR = int % chars.length;
        
        if(intR <= 0) {
            intR = chars.length;
            intD -= 1;
        }
        
        elem += chars[intR - 1];

        if(intD > 0) {
            elem = toLetter(intD) + elem;
        }
        
        return elem;
    }

    // Gera uma lista de nodes do tamanho inteiro do parametro:
    // 1 = ['A'] | 2 = ['A', 'B'] | 3 = ['A', 'B', 'C'] ...
    function genNodes(int) {
        let nodes = [];
        if(int <= 0) {
            return nodes;
        }
        for(let i = 0; i < int; i++) {
            nodes.push(toLetter(i + 1));
        }
        return nodes;
    }

    // Gera uma matriz com o tamanho do parametro, com o valor default do paramentro
    //     | 0  0 |       | 0  0  0 |
    // 2 = | 0  0 | ; 3 = | 0  0  0 | ; ...
    //                    | 0  0  0 |
    function genMatrix(size, defaultValue = 0) {
        let matrix = [];
        if(size <= 0) {
            return matrix;
        }
        for(let i = 0; i < size; i++) {
            matrix.push([]);
            for(let j = 0; j < size; j++) {
                matrix[i].push(defaultValue)
            }
        }
        return matrix;
    }

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
    function addEdge(matrix, from, to, weigth) {
        let fromI = chars.indexOf(from);
        let toI = chars.indexOf(to);
        
        matrix[fromI][toI] = weigth;
        
        if(matrix[toI][fromI] <= 0) {
            matrix[toI][fromI] = weigth * (-1);
        }
        
        return matrix;
    }

    // Passado a matriz ele a converte em um objeto de conexoes:
    // {'A': [{ to: 'Y', weigth: Z }, ...], 'B': [{...}, ...], ...}
    function extractConections(matrix) {
        let con = {};
    
        for(let i = 0; i < matrix.length; i++) {
            for(let j = 0; j < matrix[i].length; j++) {
                if(matrix[i][j] > 0) {
                    // con.push({
                    //     from: chars[i],
                    //     to: chars[j],
                    //     weigth: matrix[i][j]
                    // });
                    if(con[chars[i]] == undefined) {
                        con[chars[i]] = [];
                    }

                    con[chars[i]].push({
                        to: chars[j],
                        weigth: matrix[i][j]
                    });
                }
            }
        }
        
        return con;
    }

    // Passado um objeto com os pesos de cada elemento e dado uma origem e um destino, é calculado o menor caminho
    // pegando o destino e vendo o antecessor dele, se o antecessor não for a origem, chama a função novamente
    // passando o antecessor do mesmo como destino, quando encontrar o sucessor da origem, adiciona a origem e
    // seu sucessor em uma lista que representa o caminho, volta essa lista, se foi esse mesmo método que chamou,
    // adiciona o elemento na lista, no fim você terá uma lista [origem ... destino], do caminho completo.
    function buildPath(weightObj, orig, dest) {
        if(weightObj[dest].p == orig) {
            return [orig, dest];
        }
        let path = buildPath(weightObj, orig, weightObj[dest].p);
        path.push(dest);
        return path;
    }

    // Dado uma lista de nós, seus adjacentes com pesos, uma origem e um destino, calcula o caminho com menor custo possivel
    // Seguindo o algoritmo de Dijkstra 
    function dijkstra(nodes, adjs, orig, dest) {
        let pathWeight = {};
        
        nodes.forEach(node => {
            pathWeight[node] = {w: Infinity, p: null};
        });
        
        let unvisited = nodes;
        let now = orig;  
        pathWeight[orig].w = 0;
    
        while(unvisited.length > 0) {
            let min = Infinity;
        
            //Obtem menor valor não visitado
            Object.keys(pathWeight).forEach(k => {
                if(unvisited.includes(k) && pathWeight[k].w < min) {
                    min = pathWeight[k].w;
                    now = k;
                }
            });
        
            //Calcula o valor de seus adjacentes
            if(adjs[now] != undefined) {
                adjs[now].forEach(adj => {
                    const OLD = pathWeight[adj.to].w;
                    const NEW = pathWeight[now].w + adj.weight;
                    if(NEW < OLD) {
                        pathWeight[adj.to].w = NEW;
                        pathWeight[adj.to].p = now;
                    }
                });
            }
        
            unvisited.splice(unvisited.indexOf(now), 1)
        }

        let path = buildPath(pathWeight, orig, dest);
        
        return {"path": path, "weight": pathWeight[dest]};
    }

    return (
        <> 
            <input value={numElem} onChange={(e) => setNumElem(e.target.value)}/>
            <button onClick={() => console.log(genMatrix(numElem))}>Matrix</button>
            <button onClick={() => console.log(toLetter(numElem))}>Letter</button>
            <Button>Letter</Button>
        </>
    )
}