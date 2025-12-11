interface Observation {
  observation_number: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  photo_file?: File | null;
}

interface PabObservationManagerProps {
  observations: Observation[];
  setObservations: (observations: Observation[]) => void;
  allowSingleObservation: boolean;
}

export function usePabObservationManager({
  observations,
  setObservations,
  allowSingleObservation
}: PabObservationManagerProps) {
  
  const addObservation = () => {
    if (observations.length < 3) {
      setObservations([...observations, {
        observation_number: observations.length + 1,
        description: '',
        category: '',
        conditions_actions: '',
        hazard_factors: '',
        measures: '',
        responsible_person: '',
        deadline: '',
        photo_file: null
      }]);
    }
  };

  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], [field]: value };
    setObservations(updated);
  };

  const handleObservationPhotoChange = (index: number, file: File | null) => {
    const updated = [...observations];
    updated[index] = { ...updated[index], photo_file: file };
    setObservations(updated);
  };

  const areAllObservationsFilled = () => {
    if (allowSingleObservation) {
      if (observations.length < 1) return false;
      
      for (const obs of observations) {
        if (!obs.description || !obs.category || !obs.conditions_actions || 
            !obs.hazard_factors || !obs.measures || !obs.responsible_person || !obs.deadline) {
          return false;
        }
      }
      return true;
    }
    
    if (observations.length < 3) return false;
    
    for (const obs of observations) {
      if (!obs.description || !obs.category || !obs.conditions_actions || 
          !obs.hazard_factors || !obs.measures || !obs.responsible_person || !obs.deadline) {
        return false;
      }
    }
    return true;
  };

  return {
    addObservation,
    updateObservation,
    handleObservationPhotoChange,
    areAllObservationsFilled
  };
}
