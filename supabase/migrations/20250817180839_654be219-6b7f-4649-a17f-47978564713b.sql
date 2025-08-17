-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create queues table
CREATE TABLE public.queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chips table
CREATE TABLE public.chips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  qr_code TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chip_id UUID REFERENCES public.chips(id),
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  queue_id UUID REFERENCES public.queues(id),
  priority INTEGER DEFAULT 1,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'user', 'contact', 'system'
  message_type TEXT DEFAULT 'text',
  sender_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign contacts table
CREATE TABLE public.campaign_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  custom_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- 'queue', 'chip', 'conversation'
  resource_id UUID NOT NULL,
  permission_type TEXT NOT NULL, -- 'read', 'write', 'admin'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id, permission_type)
);

-- Create queue managers table
CREATE TABLE public.queue_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(queue_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_managers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for queues
CREATE POLICY "Users can view queues they have access to" ON public.queues FOR SELECT USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can create queues" ON public.queues FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Queue creators and managers can update" ON public.queues FOR UPDATE USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = id AND user_id = auth.uid())
);

-- Create RLS policies for chips
CREATE POLICY "Users can view chips they have access to" ON public.chips FOR SELECT USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND resource_type = 'chip' AND resource_id = id)
);
CREATE POLICY "Users can create chips" ON public.chips FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Chip creators can update" ON public.chips FOR UPDATE USING (auth.uid() = created_by);

-- Create RLS policies for conversations
CREATE POLICY "Users can view conversations they have access to" ON public.conversations FOR SELECT USING (
  auth.uid() = assigned_to OR 
  EXISTS (SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND resource_type = 'conversation' AND resource_id = id) OR
  EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = conversations.queue_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Assigned users can update conversations" ON public.conversations FOR UPDATE USING (
  auth.uid() = assigned_to OR 
  EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = conversations.queue_id AND user_id = auth.uid())
);

-- Create RLS policies for messages
CREATE POLICY "Users can view messages from accessible conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (
    assigned_to = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = conversations.queue_id AND user_id = auth.uid())
  ))
);
CREATE POLICY "Users can create messages" ON public.messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (
    assigned_to = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.queue_managers WHERE queue_id = conversations.queue_id AND user_id = auth.uid())
  ))
);

-- Create RLS policies for campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = created_by);

-- Create RLS policies for campaign contacts
CREATE POLICY "Users can view contacts from their campaigns" ON public.campaign_contacts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND created_by = auth.uid())
);
CREATE POLICY "Users can create contacts for their campaigns" ON public.campaign_contacts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND created_by = auth.uid())
);
CREATE POLICY "Users can update contacts from their campaigns" ON public.campaign_contacts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND created_by = auth.uid())
);
CREATE POLICY "Users can delete contacts from their campaigns" ON public.campaign_contacts FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND created_by = auth.uid())
);

-- Create RLS policies for user permissions
CREATE POLICY "Admins can view all permissions" ON public.user_permissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can create permissions" ON public.user_permissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update permissions" ON public.user_permissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete permissions" ON public.user_permissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create RLS policies for queue managers
CREATE POLICY "Users can view queue managers" ON public.queue_managers FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.queues WHERE id = queue_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Queue creators and admins can manage queue managers" ON public.queue_managers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.queues WHERE id = queue_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Queue creators and admins can update queue managers" ON public.queue_managers FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.queues WHERE id = queue_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Queue creators and admins can delete queue managers" ON public.queue_managers FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.queues WHERE id = queue_id AND created_by = auth.uid()) OR
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'user'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON public.queues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chips_updated_at BEFORE UPDATE ON public.chips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();