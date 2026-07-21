import type{PropsWithChildren}from'react';import{useEffect,useState}from'react';import{router,usePathname}from'expo-router';import{isOnboardingComplete}from'@/services/onboardingService';
export function OnboardingGate({children}:PropsWithChildren){const path=usePathname();const[checked,setChecked]=useState(false);useEffect(()=>{void isOnboardingComplete().then(done=>{setChecked(true);if(!done&&path!=='/onboarding')router.replace('/onboarding');});},[path]);return checked?children:null;}

