import { useState, useCallback } from 'react';

// Parameter 类型内联定义
interface Parameter {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean' | 'range';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  unit?: string;
  description?: string;
}

export interface UseParametersOptions {
  initialParameters: Parameter[];
  onChange?: (id: string, value: number | string | boolean, allParams: Parameter[]) => void;
}

export function useParameters(options: UseParametersOptions) {
  const { initialParameters, onChange } = options;
  
  const [parameters, setParameters] = useState<Parameter[]>(initialParameters);

  const updateParameter = useCallback((id: string, value: number | string | boolean) => {
    setParameters(prev => {
      const newParams = prev.map(param => 
        param.id === id ? { ...param, value } : param
      );
      onChange?.(id, value, newParams);
      return newParams;
    });
  }, [onChange]);

  const getParameter = useCallback((id: string): Parameter | undefined => {
    return parameters.find(p => p.id === id);
  }, [parameters]);

  const getValue = useCallback(<T = number | string | boolean>(id: string): T | undefined => {
    const param = parameters.find(p => p.id === id);
    return param?.value as T;
  }, [parameters]);

  const resetParameters = useCallback(() => {
    setParameters(initialParameters);
  }, [initialParameters]);

  const setParameterValues = useCallback((values: Record<string, number | string | boolean>) => {
    setParameters(prev => 
      prev.map(param => 
        values[param.id] !== undefined 
          ? { ...param, value: values[param.id] } 
          : param
      )
    );
  }, []);

  return {
    parameters,
    updateParameter,
    getParameter,
    getValue,
    resetParameters,
    setParameterValues,
  };
}
