import { useEffect } from "react";
import { RolePermissionCreateView } from "../../../section/Nabha-management/Role-permission/view";

const RolePermissionCreatePage = () => {
    useEffect(() => {
        document.title = `RuralSpark: Create New User Role Permission`;
    }, []);
    return (<RolePermissionCreateView/>)
}

export default RolePermissionCreatePage
