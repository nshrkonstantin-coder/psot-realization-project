const DEMO_COMPANY = 'ООО "Западная Нефтяная Компания"';
const REAL_COMPANY = 'АО «ГРК «Западная» Рудник «Бадран»';
const REAL_COMPANY_SHORT = 'АО "ГРК "Западная"';

export const isDemoUser = (): boolean => localStorage.getItem('userRole') === 'demo';

export const getCompanyFullName = (): string => (isDemoUser() ? DEMO_COMPANY : REAL_COMPANY);

export const getCompanyShortName = (): string => (isDemoUser() ? DEMO_COMPANY : REAL_COMPANY_SHORT);

export const getMineName = (): string => (isDemoUser() ? '' : 'Рудник «Бадран»');
