import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import Onboarding from '../pages/auth/onboarding/onboarding';
import InputPhoneNumber from '../pages/auth/withNumber/withNumber';
import VerifycationNumber from '../pages/auth/verifycationNumer/verification';
import ClientRegister from '../pages/client/clientRegister/clientRegister/clientRegister';
import ChoiceMode from '../pages/auth/UserMode/userMode';
import DeliverRegister from '../pages/deliver/deliverRegister/screenOne/one';
import DeliverRegisterTwo from '../pages/deliver/deliverRegister/screenTwo/two';
import DeliverRegisterThree from '../pages/deliver/deliverRegister/screenThree/three';
import DeliverRegisterFour from '../pages/deliver/deliverRegister/screenFour/four';
import ClientRegisterEmail from '../pages/client/clientRegister/clientRegisterEmail/clientRegisterEmail';
import LocationPermission from '../pages/client/locationPermission/clientPermission';
import FirstRegistrationStatus from '../pages/deliver/registrationStatus/firstRegisterStatus/firstRegisterStatus';
import SecundRegistrationStatus from '../pages/deliver/registrationStatus/secundRegisterStatus/secundRegisterStatus';
import ThirdRegistrationStatus from '../pages/deliver/registrationStatus/thirdRegisterStatus/thirdRegisterStatus';
import AccessConfig from '../pages/deliver/deliverPermission/deliverPermission';

// ✅ BottomRoutes contém o Drawer com o Home dentro
import BottomRoutes from './bottom.routes';
import DeliverRoutes from './deliver.routes';

const Stack = createStackNavigator();

export default function Routes() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    >

      <Stack.Screen name="DeliverHomeTab" component={DeliverRoutes} />
      <Stack.Screen name="Home" component={BottomRoutes} />
      
      {/* ✅ Home agora é o BottomRoutes que tem o Drawer */}
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="InputPhoneNumber" component={InputPhoneNumber} />
      <Stack.Screen name="VerifycationNumber" component={VerifycationNumber} />
      <Stack.Screen name="ChoiceMode" component={ChoiceMode} />
      <Stack.Screen name="ClientRegister" component={ClientRegister} />
      <Stack.Screen name="ClientRegisterEmail" component={ClientRegisterEmail} />
      <Stack.Screen name="LocationPermission" component={LocationPermission} />
      <Stack.Screen name="DeliverRegister" component={DeliverRegister} />
      <Stack.Screen name="DeliverRegisterTwo" component={DeliverRegisterTwo} />
      <Stack.Screen name="DeliverRegisterThree" component={DeliverRegisterThree} />
      <Stack.Screen name="DeliverRegisterFour" component={DeliverRegisterFour} />
      <Stack.Screen name="FirstRegistrationStatus" component={FirstRegistrationStatus} />
      <Stack.Screen name="SecundRegistrationStatus" component={SecundRegistrationStatus} />
      <Stack.Screen name="ThirdRegistrationStatus" component={ThirdRegistrationStatus} />
      <Stack.Screen name="AccessConfig" component={AccessConfig} />
    </Stack.Navigator>
  );
}