/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SupersetClient, styled, t, css } from '@superset-ui/core';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Typography,
  Icons,
  Divider,
} from '@superset-ui/core/components';
import { useState, useEffect } from 'react';
import { capitalize } from 'lodash/fp';
import Lottie from 'lottie-react';
import getBootstrapData from 'src/utils/getBootstrapData';
import { assetUrl } from 'src/utils/assetUrl';

type OAuthProvider = {
  name: string;
  icon: string;
};

type OIDProvider = {
  name: string;
  url: string;
};

type Provider = OAuthProvider | OIDProvider;

interface LoginForm {
  username: string;
  password: string;
}

enum AuthType {
  AuthOID = 0,
  AuthDB = 1,
  AuthLDAP = 2,
  AuthOauth = 4,
  AuthHybrid = 5,
}

// Main container for the entire login page
const LoginContainer = styled.div`
  ${({ theme }) => css`
    min-height: 90vh;
    background: linear-gradient(135deg, 
      ${theme.colorBgBase} 0%, 
      ${theme.colorBgContainer} 50%, 
      ${theme.colorBgElevated} 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${theme.sizeUnit * 8}px;

    @media (max-width: 768px) {
      padding: ${theme.sizeUnit * 4}px;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 12px 40px rgba(139, 92, 246, 0.4);
      }
    }
  `}
`;

// Two-column layout container
const LoginGrid = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${theme.sizeUnit * 12}px;
    max-width: 1200px;
    width: 100%;
    align-items: center;
    min-height: 600px;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
      gap: ${theme.sizeUnit * 8}px;
      text-align: center;
    }

    @media (max-width: 768px) {
      gap: ${theme.sizeUnit * 6}px;
    }
  `}
`;

// Left column for the form
const FormColumn = styled.div`
  ${({ theme }) => css`
    display: flex;
    justify-content: center;
    align-items: center;

    @media (max-width: 1024px) {
      order: 2;
    }
  `}
`;

// Right column for the animation - full width
const AnimationColumn = styled.div`
  ${({ theme }) => css`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 90%;

    @media (max-width: 1024px) {
      order: 1;
      height: 400px;
    }
  `}
`;

// Lottie animation container - full size
const AnimationContainer = styled.div`
  ${({ theme }) => css`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: transparent;

    @media (max-width: 1024px) {
      height: 400px;
    }
  `}
`;

// Professional card for the form
const StyledCard = styled(Card)`
  ${({ theme }) => css`
    max-width: 450px;
    width: 100%;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    border: 1px solid ${theme.colorBorderSecondary};
    border-radius: ${theme.borderRadiusLG}px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    .ant-card-head {
      border-bottom: 1px solid ${theme.colorBorderSecondary};
      background: transparent;
      text-align: center;
    }

    .ant-card-head-title {
      color: ${theme.colorTextHeading};
      font-size: ${theme.fontSizeXL}px;
      font-weight: 600;
    }

    .ant-card-body {
      padding: ${theme.sizeUnit * 8}px;
    }

    @media (max-width: 768px) {
      max-width: 100%;
      margin: 0;
      
      .ant-card-body {
        padding: ${theme.sizeUnit * 6}px;
      }
    }
  `}
`;

// Styled form inputs
const StyledInput = styled(Input)`
  ${({ theme }) => css`
    height: 48px;
    border-radius: ${theme.borderRadius}px;
    border: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorBgContainer};
    transition: all 0.2s ease;
    font-size: ${theme.fontSize}px;

    &:hover {
      border-color: ${theme.colorPrimaryBorderHover};
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
    }

    &:focus, &.ant-input-focused {
      border-color: ${theme.colorPrimary};
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }

    .ant-input-prefix {
      color: ${theme.colorTextTertiary};
      margin-right: ${theme.sizeUnit * 2}px;
    }
  `}
`;

const StyledPasswordInput = styled(Input.Password)`
  ${({ theme }) => css`
    height: 48px;
    border-radius: ${theme.borderRadius}px;
    border: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorBgContainer};
    transition: all 0.2s ease;
    font-size: ${theme.fontSize}px;

    &:hover {
      border-color: ${theme.colorPrimaryBorderHover};
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
    }

    &:focus, &.ant-input-focused {
      border-color: ${theme.colorPrimary};
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }

    .ant-input-prefix {
      color: ${theme.colorTextTertiary};
      margin-right: ${theme.sizeUnit * 2}px;
    }

    .ant-input-suffix {
      color: ${theme.colorTextTertiary};
    }
  `}
`;

// Consistent button styling for all buttons
const BaseButton = styled(Button)`
  ${({ theme }) => css`
    height: 48px;
    border-radius: ${theme.borderRadius}px;
    font-size: ${theme.fontSize}px;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }

    .anticon {
      font-size: 18px;
    }
  `}
`;

// Primary login button
const PrimaryButton = styled(BaseButton)`
  ${({ theme }) => css`
    background: ${theme.colorPrimary};
    border-color: ${theme.colorPrimary};

    &:hover {
      background: ${theme.colorPrimaryHover};
      border-color: ${theme.colorPrimaryHover};
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  `}
`;

// OAuth button styling
const OAuthButton = styled(BaseButton)`
  ${({ theme }) => css`
    border: 1px solid ${theme.colorBorderSecondary};
    background: ${theme.colorBgContainer};
    color: ${theme.colorText};

    &:hover {
      border-color: ${theme.colorPrimary};
      color: ${theme.colorPrimary};
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
    }
  `}
`;

// Register button styling
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RegisterButton = styled(BaseButton)`
  ${({ theme }) => css`
    border: 1px solid ${theme.colorBorderSecondary};
    background: transparent;
    color: ${theme.colorText};

    &:hover {
      border-color: ${theme.colorPrimary};
      color: ${theme.colorPrimary};
      background: rgba(139, 92, 246, 0.05);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);
    }
  `}
`;

// Form labels
const StyledLabel = styled(Typography.Text)`
  ${({ theme }) => css`
    font-size: ${theme.fontSizeSM}px;
    font-weight: 500;
    color: ${theme.colorTextLabel};
    margin-bottom: ${theme.sizeUnit}px;
    display: block;
  `}
`;

// Section divider
const SectionDivider = styled(Divider)`
  ${({ theme }) => css`
    margin: ${theme.sizeUnit * 6}px 0 ${theme.sizeUnit * 4}px 0;
    border-color: ${theme.colorBorderSecondary};

    .ant-divider-inner-text {
      color: ${theme.colorTextSecondary};
      font-size: ${theme.fontSizeSM}px;
      font-weight: 500;
    }
  `}
`;

// Welcome section
const WelcomeSection = styled.div`
  ${({ theme }) => css`
    text-align: center;
    margin-bottom: ${theme.sizeUnit * 6}px;

    h1 {
      color: ${theme.colorTextHeading};
      font-size: ${theme.fontSizeXL}px;
      font-weight: 600;
      margin-bottom: ${theme.sizeUnit * 2}px;
    }

    p {
      color: ${theme.colorTextSecondary};
      font-size: ${theme.fontSize}px;
      margin: 0;
    }
  `}
`;

export default function Login() {
  const [form] = Form.useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);

  const bootstrapData = getBootstrapData();

  const authType: AuthType = bootstrapData.common.conf.AUTH_TYPE;
  const providers: Provider[] = bootstrapData.common.conf.AUTH_PROVIDERS;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const authRegistration: boolean =
    bootstrapData.common.conf.AUTH_USER_REGISTRATION;

  useEffect(() => {
    // Try multiple paths to load animation data
    const tryPaths = [
      assetUrl('DataAnalysis.json'),
      '/static/assets/DataAnalysis.json',
      '/DataAnalysis.json',
      './DataAnalysis.json'
    ];

    const tryLoadAnimation = async () => {
      for (const path of tryPaths) {
        try {
          console.log('Trying to load animation from:', path);
          const response = await fetch(path);
          
          if (response.ok) {
            const data = await response.json();
            
            // Basic validation for Lottie data
            if (data && data.v && data.fr && data.layers) {
              setAnimationData(data);
              console.log('Lottie animation loaded successfully from:', path);
              return;
            } else {
              console.warn('Invalid Lottie animation data from:', path);
            }
          } else {
            console.warn(`Failed to fetch from ${path}: ${response.status}`);
          }
        } catch (error) {
          console.warn(`Error loading from ${path}:`, error);
        }
      }
      
      // If all paths fail, set to null
      console.error('Failed to load animation from all paths');
      setAnimationData(null);
    };

    tryLoadAnimation();
  }, []);

  const onFinish = (values: LoginForm) => {
    setLoading(true);
    SupersetClient.postForm('/login/', values, '').finally(() => {
      setLoading(false);
    });
  };

  const getAuthIconElement = (
    providerName: string,
  ): React.JSX.Element | undefined => {
    if (!providerName || typeof providerName !== 'string') {
      return undefined;
    }
    const iconComponentName = `${capitalize(providerName)}Outlined`;
    const IconComponent = (Icons as Record<string, React.ComponentType<any>>)[
      iconComponentName
    ];

    if (IconComponent && typeof IconComponent === 'function') {
      return <IconComponent />;
    }
    return undefined;
  };

  const renderUsernamePasswordForm = () => (
    <>
      {/* <WelcomeSection>
        <Typography.Title level={4}>
          {t('Welcome back')}
        </Typography.Title>
        <Typography.Text type="secondary">
          {t('Enter your credentials to access your account')}
        </Typography.Text>
      </WelcomeSection> */}

      <Form
        layout="vertical"
        requiredMark="optional"
        form={form}
        onFinish={onFinish}
      >
        <Form.Item<LoginForm>
          label={<StyledLabel>{t('Username')}</StyledLabel>}
          name="username"
          rules={[
            { required: true, message: t('Please enter your username') },
          ]}
        >
          <StyledInput
            autoFocus
            prefix={<Icons.UserOutlined />}
            placeholder={t('Enter your username')}
            data-test="username-input"
          />
        </Form.Item>

        <Form.Item<LoginForm>
          label={<StyledLabel>{t('Password')}</StyledLabel>}
          name="password"
          rules={[
            { required: true, message: t('Please enter your password') },
          ]}
        >
          <StyledPasswordInput
            prefix={<Icons.LockOutlined />}
            placeholder={t('Enter your password')}
            data-test="password-input"
          />
        </Form.Item>

        <Form.Item>
          <PrimaryButton
            block
            type="primary"
            htmlType="submit"
            loading={loading}
            data-test="login-button"
          >
            {t('Sign in')}
          </PrimaryButton>
        </Form.Item>

        {/* {authRegistration && (
          <Form.Item>
            <RegisterButton
              block
              type="default"
              href="/register/"
              data-test="register-button"
            >
              {t('Create an account')}
            </RegisterButton>
          </Form.Item>
        )} */}
      </Form>
    </>
  );

  const renderOAuthSection = () => (
    <>
                <WelcomeSection>
                  <Typography.Title level={4}>
                    {t('Welcome to Superset')}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    {t('Choose your preferred sign-in method')}
                  </Typography.Text>
                </WelcomeSection>
      
      {/* Standard OAuth providers */}
      {authType === AuthType.AuthOauth && (
        <Flex vertical gap="small">
          {providers.map((provider: OAuthProvider) => (
            <OAuthButton
              key={provider.name}
              href={`/login/${provider.name}`}
              block
              icon={getAuthIconElement(provider.name)}
            >
              {t('Continue with')} {capitalize(provider.name)}
            </OAuthButton>
          ))}
        </Flex>
      )}

      {/* OpenID providers */}
      {authType === AuthType.AuthOID && (
        <Flex vertical gap="small">
          {providers.map((provider: OIDProvider) => (
            <OAuthButton
              key={provider.name}
              href={`/login/${provider.name}`}
              block
              icon={getAuthIconElement(provider.name)}
            >
              {t('Continue with')} {capitalize(provider.name)}
            </OAuthButton>
          ))}
        </Flex>
      )}

      {/* Google OAuth for hybrid/DB auth */}
      {(authType === AuthType.AuthDB || authType === AuthType.AuthHybrid) && (
        <OAuthButton
          href="/oauth/login/google"
          block
          icon={getAuthIconElement('google')}
        >
          {t('Continue with Google')}
        </OAuthButton>
      )}

<SectionDivider>{t('Or continue with')}</SectionDivider>
    </>
  );

  return (
    <LoginContainer data-test="login-form">
      <LoginGrid>
        {/* Left Column - Login Form */}
        <FormColumn>
          <StyledCard>
            

            {/* OAuth only flow */}
            {/* {(authType === AuthType.AuthOauth || authType === AuthType.AuthOID) && (
              <>
                
                {renderOAuthSection()}
              </>
            )} */}

            {/* OAuth Section at Bottom for hybrid/DB auth */}
            {(authType === AuthType.AuthDB || authType === AuthType.AuthHybrid) && 
              renderOAuthSection()}
              {/* Username/Password Form at Top */}
            {(authType === AuthType.AuthDB || 
              authType === AuthType.AuthLDAP || 
              authType === AuthType.AuthHybrid) && 
              renderUsernamePasswordForm()}
          </StyledCard>
        </FormColumn>

        {/* Right Column - Lottie Animation */}
        <AnimationColumn>
          <AnimationContainer>
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop={true}
                autoplay={true}
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <Flex
                justify="center"
                align="center"
                style={{
                  width: '100%',
                  height: '100%',
                  color: '#8B5CF6',
                }}
                vertical
                gap="large"
              >
                <Icons.BarChartOutlined 
                  style={{ 
                    fontSize: '72px', 
                    opacity: 0.7,
                    color: '#8B5CF6'
                  }} 
                />
                <Typography.Title 
                  level={4}
                  style={{ 
                    textAlign: 'center', 
                    margin: 0,
                    color: '#8B5CF6'
                  }}
                >
                  {t('Data Analytics')}
                </Typography.Title>
                <Typography.Text 
                  type="secondary" 
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '16px',
                    maxWidth: '280px',
                    lineHeight: '1.5'
                  }}
                >
                  {t('Loading visualization...')}
                </Typography.Text>
              </Flex>
            )}
          </AnimationContainer>
        </AnimationColumn>
      </LoginGrid>
    </LoginContainer>
  );
}