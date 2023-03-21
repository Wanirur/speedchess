"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import cn from "~/utils/cn";
import AvatarDropdownMenu from "./avatar-dropdown";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./ui/navigation-menu";

type NavbarProps = {
  loggedIn: boolean;
  avatar?: string | null;
};

const Navbar: React.FC<NavbarProps> = (props) => {
  return (
    <NavigationMenu className="flex justify-between bg-slate-800 px-24 py-1 text-white font-os">
      <NavigationMenuList className="space-x-8">
        <NavigationMenuItem>
          <Image
            src={"/robot-line-icon.svg"}
            alt="logo"
            width={50}
            height={50}
          ></Image>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Rankings</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ListItem> Best creators </ListItem>
            <ListItem> Best bots </ListItem>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/watch" passHref legacyBehavior>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Watch
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuList className="space-x-8">
        <NavigationMenuItem>
          <Link href="/add" passHref legacyBehavior>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Add
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        <NavigationMenuItem>
          {props.loggedIn ? (
            <AvatarDropdownMenu
              avatar={props.avatar || ""}
            ></AvatarDropdownMenu>
          ) : (
            <button
              type="button"
              className="text-md font-bold text-white hover:rounded-lg hover:bg-gray-700"
            >
              log in
            </button>
          )}
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-slate-500 dark:text-slate-400">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export default Navbar;
