import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import A11yAuditPage from './page'

describe('A11y audit page', () => {
  it('renders the board summary and status table', () => {
    render(<A11yAuditPage />)

    expect(screen.getByRole('heading', { name: /accessibility audit board/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /board summary/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /grantfox accessibility audit board/i })).toBeInTheDocument()
    expect(screen.getByText('ConnectWalletModal')).toBeInTheDocument()
    expect(screen.getByText('New event form focus order')).toBeInTheDocument()
  })

  it('shows the expected status counts', () => {
    render(<A11yAuditPage />)

    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
