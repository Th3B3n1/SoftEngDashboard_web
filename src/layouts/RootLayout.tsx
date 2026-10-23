import { Outlet } from 'react-router-dom';
import { HeaderActions } from '../components/HeaderActions';

export function RootLayout() {
  return (
    <div className="print-page-body">
      <div className="page-shell-container">
        <HeaderActions />
        <Outlet />
      </div>
    </div>
  );
}
