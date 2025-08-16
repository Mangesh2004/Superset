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
import { styled, css } from '@superset-ui/core';
import { ReactElement } from 'react';
import { Menu as AntdMenu } from 'antd';
import { MenuProps as AntdMenuProps } from 'antd/es/menu';

export type MenuProps = AntdMenuProps;
export type { ItemType, MenuItemType } from 'antd/es/menu/interface';

export enum MenuItemKeyEnum {
  MenuItem = 'menu-item',
  SubMenu = 'submenu',
  SubMenuItem = 'submenu-item',
}

export type AntdMenuTypeRef = {
  current: { props: { parentMenu: typeof AntdMenu } };
};

export type AntdMenuItemType = ReactElement & {
  ref: AntdMenuTypeRef;
  type: { displayName: string; isSubMenu: number };
};

export type MenuItemChildType = AntdMenuItemType;

const StyledMenuItem = styled(AntdMenu.Item)`
  ${({ theme }) => css`
    border-radius: 8px;
    margin: 2px 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    
    /* Remove any default after/before pseudo elements */
    &:after, &:before {
      display: none !important;
    }
    
    a {
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
      
      /* Remove any default after/before pseudo elements */
      &:after, &:before {
        display: none !important;
      }
    }
    
    &.ant-menu-item {
      /* Remove default borders and styles */
      border: none;
      
      /* Subtle professional hover effect */
      &:hover {
        background-color: rgba(64, 169, 255, 0.06);
        transform: translateX(2px);
      }
      
      div {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      a {
        &:hover {
          color: ${theme.colorPrimary};
        }
        
        &:focus {
          outline: none;
          @media (max-width: 767px) {
            background-color: rgba(64, 169, 255, 0.06);
          }
        }
      }
    }
    
    /* Selected state */
    &.ant-menu-item-selected {
      background-color: rgba(64, 169, 255, 0.1);
      border-left: 3px solid ${theme.colorPrimary};
      
      a {
        color: ${theme.colorPrimary};
        font-weight: 500;
      }
    }
  `}
`;

const StyledMenu = styled(AntdMenu)`
  /* Clean base menu styles */
  border: none;
  
  &.ant-menu-horizontal {
    background-color: inherit;
    border-bottom: none;
    border: none;
  }
  
  /* Remove default menu item styles */
  .ant-menu-item, .ant-menu-submenu {
    border: none;
    
    &:after, &:before {
      display: none !important;
    }
  }
`;

const StyledNav = styled(AntdMenu)`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    height: 100%;
    gap: 0;
    border: none;
    border-bottom: none;
    line-height: ${theme.lineHeight};
    position: relative;
    
    /* Remove all default Ant Design styles */
    &.ant-menu-horizontal {
      border: none;
      border-bottom: none;
    }
    
    /* Clean up any default pseudo elements */
    &:after, &:before {
      display: none !important;
    }
    
    &.ant-menu-horizontal > .ant-menu-item {
      height: 100%;
      display: flex;
      align-items: center;
      margin: 0 4px;
      padding: ${theme.sizeUnit * 1.5}px ${theme.sizeUnit * 3}px;
      position: relative;
      border-radius: 12px;
      border: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      /* Remove any default pseudo elements */
      &:before {
        display: none !important;
      }
      
      /* Subtle professional hover background */
      &:hover {
        background-color: rgba(64, 169, 255, 0.08);
        transform: translateY(-1px);
      }
      
      /* Enhanced underline animation that follows cursor */
      ::after {
        content: '';
        position: absolute;
        width: 0;
        height: 3px;
        background: linear-gradient(90deg, ${theme.colorPrimary}, ${theme.colorPrimaryBorderHover});
        bottom: ${theme.sizeUnit / 4}px;
        left: 50%;
        transform: translateX(-50%);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 2px;
      }
      
      /* Smooth cursor following animation */
      :hover::after {
        width: 75%;
      }
      
      /* Text hover effect */
      :hover {
        color: ${theme.colorPrimary};
        font-weight: 500;
      }
    }
    
    /* Selected item with persistent underline */
    &.ant-menu-horizontal > .ant-menu-item-selected {
      background-color: rgba(64, 169, 255, 0.12);
      color: ${theme.colorPrimary};
      font-weight: 600;
      
      ::after {
        width: 75%;
        background: ${theme.colorPrimary};
      }
    }
  `}
`;

const StyledSubMenu = styled(AntdMenu.SubMenu)`
  ${({ theme }) => css`
    border-radius: 8px;
    margin: 2px 4px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Remove any default styles */
    &.ant-menu-submenu {
      border: none;
      
      /* Subtle hover effect for submenu */
      &:hover {
        background-color: rgba(64, 169, 255, 0.06);
      }
    }
    
    .ant-menu-submenu-open,
    .ant-menu-submenu-active {
      .ant-menu-submenu-title {
        background-color: rgba(64, 169, 255, 0.1);
        color: ${theme.colorPrimary};
        font-weight: 500;
      }
    }
    
    .ant-menu-submenu-title {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.3s ease;
      border: none;
      
      /* Remove any after pseudo elements */
      &:after {
        display: none !important;
      }
      
      &:before {
        display: none !important;
      }
      
      /* Clean hover effect without underline */
      &:hover {
        color: ${theme.colorPrimary};
        transform: translateX(2px);
      }
      
      /* Arrow styling */
      .ant-menu-submenu-arrow {
        transition: all 0.3s ease;
        margin-left: 8px;
        
        &:hover {
          color: ${theme.colorPrimary};
        }
      }
    }
    
    /* Dropdown menu styling */
    .ant-menu-submenu {
      .ant-menu {
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: none;
        
        .ant-menu-item {
          margin: 2px 4px;
          border-radius: 6px;
          transition: all 0.2s ease;
          
          &:hover {
            background-color: rgba(64, 169, 255, 0.06);
            transform: translateX(4px);
          }
        }
      }
    }
  `}
`;

export type MenuMode = AntdMenuProps['mode'];
export type MenuItem = Required<AntdMenuProps>['items'][number];

export const Menu = Object.assign(StyledMenu, {
  Item: StyledMenuItem,
  SubMenu: StyledSubMenu,
  Divider: AntdMenu.Divider,
  ItemGroup: AntdMenu.ItemGroup,
});

export const MainNav = Object.assign(StyledNav, {
  Item: StyledMenuItem,
  SubMenu: StyledSubMenu,
  Divider: AntdMenu.Divider,
  ItemGroup: AntdMenu.ItemGroup,
});
