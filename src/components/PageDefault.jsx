import { Footer } from "./Footer"
import { Header } from "./Header"

// import styled from "styled-components"

// const SPage = styled.div`
//     display: flex;
// `

export const PageDefault = ({children}) => {
    return (
        <div>
            <Header/>
            <main>
                {children}
            </main>
            <Footer />
        </div>
    )
}