import { useEffect } from 'react';
import { GovtEventCreateView } from '../../../section/Nabha-management/servey-master/view';

export default function CreateGovtEventPage() {
  useEffect(() => {
    document.title = "RuralSpark: Create New Government Event ";
  }, []);

  return <GovtEventCreateView />;
}